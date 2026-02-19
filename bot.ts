import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Telegraf } from 'telegraf';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import 'dotenv/config';

// 0. Validate Environment
const REQUIRED_ENV = ['FIREBASE_SERVICE_ACCOUNT', 'GEMINI_API_KEY', 'TELEGRAM_BOT_TOKEN'];
for (const env of REQUIRED_ENV) {
  if (!process.env[env]) {
    console.error(`❌ Missing required environment variable: ${env}`);
    process.exit(1);
  }
}

// 1. Initialize Firebase
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || '{}';
let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountString);
} catch (e) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore(app);

// 2. Define Tools for Gemini
const tools = [
  {
    functionDeclarations: [
      {
        name: "write_file",
        description: "Create or overwrite a file with specific content.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Relative path to the file." },
            content: { type: SchemaType.STRING, description: "Full content of the file." }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "read_file",
        description: "Read the content of a file.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Relative path to the file." }
          },
          required: ["path"]
        }
      },
      {
        name: "run_shell",
        description: "Execute a shell command and return the output.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            command: { type: SchemaType.STRING, description: "The shell command to run." }
          },
          required: ["command"]
        }
      },
      {
        name: "reply",
        description: "Send a message back to the user in Telegram. Use this to provide progress updates, ask questions, or give a final summary.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            text: { type: SchemaType.STRING, description: "The message text." }
          },
          required: ["text"]
        }
      }
    ]
  }
];

// 3. Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!.trim());
const model = genAI.getGenerativeModel(
  { model: "gemini-3-flash-preview", tools: tools },
  { timeout: 600000 }
);

// 4. Initialize Telegram
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!.trim(), {
  handlerTimeout: 86400000,
  telegram: {
    agent: new https.Agent({ family: 4 })
  }
});

bot.catch((err: any, ctx) => {
  console.error(`🔥 Telegraf error:`, err);
});

const MAX_MESSAGE_LENGTH = 4000;
async function safeSendMessage(chatId: number, text: string) {
  if (!text) return;
  try {
    if (text.length <= MAX_MESSAGE_LENGTH) {
      return await bot.telegram.sendMessage(chatId, text);
    }
    const truncated = text.substring(0, MAX_MESSAGE_LENGTH) + "\n\n... (message truncated)";
    return await bot.telegram.sendMessage(chatId, truncated);
  } catch (e) {
    console.error("Failed to send message:", e);
  }
}

async function processOneMessage(userMessage: string, chatId: number, repoRoot: string, messageId?: string) {
  const allowedUsers = (process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').map(s => s.trim()).filter(id => id.length > 0);
  if (allowedUsers.length > 0 && !allowedUsers.includes(chatId.toString())) {
    await safeSendMessage(chatId, "🛡️ Access Denied.");
    return;
  }

  console.log(`[Processing] ${chatId}: ${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}`);
  
  try {
    execSync('git config user.name "ClosedAI Bot"', { cwd: repoRoot });
    execSync('git config user.email "bot@closedai.local"', { cwd: repoRoot });
  } catch {}

  await bot.telegram.sendChatAction(chatId, 'typing').catch(() => {});

  const fileStructure = execSync('find . -maxdepth 2 -not -path "*/.*"', { cwd: repoRoot }).toString();
  const packageJson = fs.existsSync(path.join(repoRoot, 'package.json')) 
    ? fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8') 
    : 'Not found';
  
  const systemPrompt = `
    You are ClosedAI. Directory: ${repoRoot}
    Structure: ${fileStructure}
    package.json: ${packageJson}
  `;

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Ready." }] }
    ],
  });

  try {
    let result = await chat.sendMessage(userMessage);
    let turn = 0;

    while (turn < 10) {
      const response = result.response;
      const calls = response.functionCalls();

      if (!calls || calls.length === 0) {
        const text = response.text();
        if (text) await safeSendMessage(chatId, text);
        break;
      }

      const functionResponses = [];
      for (const call of calls) {
        const { name, args } = call;
        console.log(`   👉 Tool Call: ${name}(${JSON.stringify(args)})`);
        let content;
        try {
          if (name === "write_file") {
            const fullPath = path.join(repoRoot, (args as any).path);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, (args as any).content);
            content = { result: `Success: Wrote to ${(args as any).path}` };
          } else if (name === "read_file") {
            const fullPath = path.join(repoRoot, (args as any).path);
            content = { result: fs.readFileSync(fullPath, "utf-8") };
          } else if (name === "run_shell") {
            content = { result: execSync((args as any).command, { cwd: repoRoot }).toString() };
          } else if (name === "reply") {
            await safeSendMessage(chatId, (args as any).text);
            content = { result: "Sent." };
          }
        } catch (e: any) {
          content = { error: e.message };
        }
        functionResponses.push({ functionResponse: { name, response: content } });
      }
      result = await chat.sendMessage(functionResponses);
      turn++;
    }

    try {
      const status = execSync('git status --porcelain', { cwd: repoRoot }).toString();
      if (status.length > 0) {
        execSync('git add . && git commit -m "ClosedAI: Automatic update" && git push', { cwd: repoRoot });
      }
    } catch {}

    // Success! If this was a queued message, remove it.
    if (messageId) {
      await db.collection('queue').doc(messageId).delete().catch(() => {});
      console.log(`✅ Queue task ${messageId} completed and removed.`);
    }

  } catch (error: any) {
    if (error.status === 503 || error.message?.includes('503') || error.message?.includes('high demand')) {
      console.warn("⚠️ Gemini 503. Queueing message for retry...");
      if (!messageId) {
        await db.collection('queue').add({
          userMessage,
          chatId,
          createdAt: FieldValue.serverTimestamp(),
          attempts: 1,
          status: 'pending'
        });
        await safeSendMessage(chatId, "⚠️ Gemini is busy right now. I've queued your request and will retry automatically!");
      } else {
        await db.collection('queue').doc(messageId).set({
          attempts: FieldValue.increment(1),
          lastAttempt: FieldValue.serverTimestamp(),
          status: 'pending' // Release the lock so it can be picked up again
        }, { merge: true }).catch(() => {});
      }
    } else {
      console.error('Gemini Error:', error);
      await safeSendMessage(chatId, "❌ Error: " + error.message);
      if (messageId) await db.collection('queue').doc(messageId).delete().catch(() => {}); 
    }
  }
}

async function checkQueue(repoRoot: string) {
  // Only pick up messages that are 'pending'
  const snapshot = await db.collection('queue')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get();
    
  if (snapshot.empty) return;

  const doc = snapshot.docs[0];
  const data = doc.data();
  
  // "Lock" the document by setting status to 'processing'
  await doc.ref.update({ status: 'processing', lastAttempt: FieldValue.serverTimestamp() });
  
  console.log(`🔄 Retrying queued message from ${data.chatId}...`);
  try {
    await processOneMessage(data.userMessage, data.chatId, repoRoot, doc.id);
  } catch (err) {
    console.error(`Error during queue retry for ${doc.id}:`, err);
    // Ensure we don't leave it stuck in 'processing' on critical failure
    await doc.ref.update({ status: 'pending' }).catch(() => {});
  }
}

async function run() {
  const isPolling = process.argv.includes('--poll');
  const repoRoot = process.cwd();

  // Background queue worker with safety catch
  setInterval(() => {
    checkQueue(repoRoot).catch(err => console.error("Queue Worker Error:", err));
  }, 60000);

  if (isPolling) {
    console.log("🚀 Starting ClosedAI in Long Polling mode...");
    bot.on('message', async (ctx) => {
      if (ctx.message && 'text' in ctx.message) {
        processOneMessage(ctx.message.text, ctx.chat.id, repoRoot).catch(console.error);
      }
    });
    bot.launch({ handlerTimeout: 86400000 });
    return;
  }

  const lastProcessedRef = db.collection('config').doc('last_processed');
  const doc = await lastProcessedRef.get();
  let lastUpdateId = doc.exists ? doc.data()?.update_id || 0 : 0;

  const updates = await bot.telegram.getUpdates(100, 100, lastUpdateId + 1, ['message']);
  for (const update of updates) {
    if ('message' in update && update.message && 'text' in (update.message as any)) {
      const message = update.message as any;
      await processOneMessage(message.text, message.chat.id, repoRoot);
      lastUpdateId = update.update_id;
    }
  }
  await lastProcessedRef.set({ update_id: lastUpdateId });
}

run().catch(console.error);
