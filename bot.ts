import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Telegraf } from 'telegraf';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import pc from 'picocolors';
import 'dotenv/config';

// --- CLI UI Utilities ---

function printHeader() {
  console.log(pc.bold(pc.magenta("====================================================")));
  console.log(pc.bold(pc.magenta("         🤖 CLOSED-AI BOT ENGINE v1.1              ")));
  console.log(pc.bold(pc.magenta("====================================================")));
  console.log(`${pc.gray("Status:")} ${pc.green("Online")}`);
  console.log(`${pc.gray("Mode:")}   ${process.argv.includes('--poll') ? pc.yellow("Polling") : pc.blue("Batch Process")}`);
  console.log(pc.gray("----------------------------------------------------\n"));
}

function logInstruction(chatId: number, type: string, details: string) {
  const timestamp = new Date().toLocaleTimeString();
  const colorMap: any = {
    'WRITE': pc.blue,
    'READ': pc.cyan,
    'SHELL': pc.yellow,
    'REPLY': pc.green,
    'GEMINI': pc.magenta,
    'ERROR': pc.red,
    'CMD': pc.white
  };
  const color = colorMap[type] || pc.white;
  console.log(`${pc.gray(`[${timestamp}]`)} ${pc.bold(pc.white(`[Chat ${chatId}]`))} ${color(type.padEnd(6))} ${details}`);
}

// --- Validation ---

const REQUIRED_ENV = ['FIREBASE_SERVICE_ACCOUNT', 'GEMINI_API_KEY', 'TELEGRAM_BOT_TOKEN'];
for (const env of REQUIRED_ENV) {
  if (!process.env[env]) {
    console.error(pc.red(`❌ Missing required environment variable: ${env}`));
    process.exit(1);
  }
}

// --- Initialization ---

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || '{}';
let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountString);
} catch (e) {
  console.error(pc.red('❌ FIREBASE_SERVICE_ACCOUNT is not valid JSON.'));
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!.trim());
const model = genAI.getGenerativeModel(
  { model: "gemini-3-flash-preview", tools: tools },
  { timeout: 600000 }
);

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!.trim(), {
  handlerTimeout: 86400000,
  telegram: { agent: new https.Agent({ family: 4 }) }
});

bot.catch((err: any) => {
  logInstruction(0, 'ERROR', `Telegraf error: ${err.message}`);
});

const MAX_MESSAGE_LENGTH = 4000;
async function safeSendMessage(chatId: number, text: string) {
  if (!text) return;
  try {
    if (text.length <= MAX_MESSAGE_LENGTH) {
      return await bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    }
    const truncated = text.substring(0, MAX_MESSAGE_LENGTH) + "\n\n... (message truncated)";
    return await bot.telegram.sendMessage(chatId, truncated, { parse_mode: 'Markdown' });
  } catch (e) {
    try {
      return await bot.telegram.sendMessage(chatId, text);
    } catch (e2) {
      logInstruction(chatId, 'ERROR', `Failed to send message: ${e2}`);
    }
  }
}

async function handleSystemCommands(userMessage: string, chatId: number, repoRoot: string): Promise<boolean> {
  const cmd = userMessage.trim().toLowerCase();
  
  if (cmd === '/log') {
    logInstruction(chatId, 'CMD', 'Executing /log');
    const snapshot = await db.collection('history').orderBy('timestamp', 'desc').limit(10).get();
    if (snapshot.empty) {
      await safeSendMessage(chatId, "No history found.");
      return true;
    }
    let response = "📜 *Recent Commands:*\n\n";
    snapshot.docs.reverse().forEach(doc => {
      const data = doc.data();
      const date = data.timestamp?.toDate().toLocaleTimeString() || 'unknown';
      response += `\`[${date}]\` ${data.text}\n`;
    });
    await safeSendMessage(chatId, response);
    return true;
  }

  if (cmd === '/gitlog') {
    logInstruction(chatId, 'CMD', 'Executing /gitlog');
    try {
      const gitLog = execSync('git log -n 5 --pretty=format:"%h - %s (%cr)"', { cwd: repoRoot }).toString();
      await safeSendMessage(chatId, `🌳 *Recent Commits:*\n\n\`\`\`\n${gitLog}\n\`\`\``);
    } catch (e: any) {
      await safeSendMessage(chatId, "❌ Failed to fetch git log: " + e.message);
    }
    return true;
  }

  if (cmd === '/status') {
    logInstruction(chatId, 'CMD', 'Executing /status');
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const mem = process.memoryUsage();
    
    let gitHash = 'unknown';
    try {
      gitHash = execSync('git rev-parse --short HEAD', { cwd: repoRoot }).toString().trim();
    } catch {}

    const response = `✅ *System Status*\n\n` +
      `⏱ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
      `🧠 *Memory:* ${Math.round(mem.rss / 1024 / 1024)}MB\n` +
      `📦 *Version:* \`${gitHash}\`\n` +
      `⚙️ *Mode:* ${process.argv.includes('--poll') ? "Polling" : "Batch"}\n` +
      `📂 *Root:* \`${repoRoot}\``;
    
    await safeSendMessage(chatId, response);
    return true;
  }

  if (cmd === '/queue') {
    logInstruction(chatId, 'CMD', 'Executing /queue');
    const snapshot = await db.collection('queue').orderBy('createdAt', 'asc').get();
    if (snapshot.empty) {
      await safeSendMessage(chatId, "📭 Queue is empty.");
      return true;
    }
    let response = `⏳ *Current Queue (${snapshot.size}):*\n\n`;
    snapshot.forEach(doc => {
      const data = doc.data();
      response += `• \`${data.userMessage.substring(0, 20)}...\` (Attempts: ${data.attempts})\n`;
    });
    await safeSendMessage(chatId, response);
    return true;
  }

  if (cmd === '/help') {
    const response = `🤖 *ClosedAI Help*\n\n` +
      `/status - Show system status\n` +
      `/log - Show last 10 commands\n` +
      `/gitlog - Show last 5 git commits\n` +
      `/queue - Show queued tasks\n` +
      `/help - Show this message\n\n` +
      `Any other message will be processed by Gemini.`;
    await safeSendMessage(chatId, response);
    return true;
  }

  return false;
}

async function processOneMessage(userMessage: string, chatId: number, repoRoot: string, messageId?: string) {
  const allowedUsers = (process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').map(s => s.trim()).filter(id => id.length > 0);
  if (allowedUsers.length > 0 && !allowedUsers.includes(chatId.toString())) {
    await safeSendMessage(chatId, "🛡️ Access Denied.");
    logInstruction(chatId, 'ERROR', 'Unauthorized access attempt.');
    return;
  }

  // Record history (ignore system commands in history to keep it clean, or keep them?)
  // Let's keep them so /log shows what happened.
  await db.collection('history').add({
    chatId,
    text: userMessage,
    timestamp: FieldValue.serverTimestamp()
  });

  // Check for commands
  if (userMessage.startsWith('/')) {
    const handled = await handleSystemCommands(userMessage, chatId, repoRoot);
    if (handled) return;
  }

  logInstruction(chatId, 'GEMINI', `Processing: ${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}`);
  
  try {
    execSync('git config user.name "ClosedAI Bot"', { cwd: repoRoot });
    execSync('git config user.email "bot@closedai.local"', { cwd: repoRoot });
  } catch {}

  await bot.telegram.sendChatAction(chatId, 'typing').catch(() => {});

  const fileStructure = execSync('find . -maxdepth 2 -not -path "*/.*"', { cwd: repoRoot }).toString();
  const packageJson = fs.existsSync(path.join(repoRoot, 'package.json')) 
    ? fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8') 
    : 'Not found';
  
  const systemPrompt = `You are ClosedAI. Directory: ${repoRoot}\nStructure: ${fileStructure}\npackage.json: ${packageJson}\nComplete tasks in 10 actions or less.`;

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Ready." }] }
    ],
  });

  try {
    logInstruction(chatId, 'GEMINI', 'Requesting initial response...');
    let result = await chat.sendMessage(userMessage);
    let turn = 0;

    while (turn < 10) {
      const response = result.response;
      const calls = response.functionCalls();

      if (!calls || calls.length === 0) {
        const text = response.text();
        if (text) {
          await safeSendMessage(chatId, text);
          logInstruction(chatId, 'GEMINI', 'Final response sent.');
        }
        break;
      }

      const functionResponses = [];
      for (const call of calls) {
        const { name, args } = call;
        let content;
        try {
          if (name === "write_file") {
            const p = (args as any).path;
            const fullPath = path.join(repoRoot, p);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, (args as any).content);
            content = { result: `Success: Wrote to ${p}` };
            logInstruction(chatId, 'WRITE', p);
          } else if (name === "read_file") {
            const p = (args as any).path;
            const fullPath = path.join(repoRoot, p);
            content = { result: fs.readFileSync(fullPath, "utf-8") };
            logInstruction(chatId, 'READ', p);
          } else if (name === "run_shell") {
            const cmd = (args as any).command;
            content = { result: execSync(cmd, { cwd: repoRoot }).toString() };
            logInstruction(chatId, 'SHELL', cmd);
          } else if (name === "reply") {
            const txt = (args as any).text;
            await safeSendMessage(chatId, txt);
            content = { result: "Sent." };
            logInstruction(chatId, 'REPLY', txt.substring(0, 30) + '...');
          }
        } catch (e: any) {
          content = { error: e.message };
          logInstruction(chatId, 'ERROR', `Tool ${name} failed: ${e.message}`);
        }
        functionResponses.push({ functionResponse: { name, response: content } });
      }
      
      turn++;
      logInstruction(chatId, 'GEMINI', `Turn ${turn}/10 completed. Requesting next step...`);
      result = await chat.sendMessage(functionResponses);
    }
    logInstruction(chatId, 'GEMINI', 'Request sequence finished.');

    try {
      const status = execSync('git status --porcelain', { cwd: repoRoot }).toString();
      if (status.length > 0) {
        execSync('git add . && git commit -m "ClosedAI: Automatic update" && git push', { cwd: repoRoot });
        logInstruction(chatId, 'SHELL', 'Git push completed.');
      }
    } catch (e: any) {
      logInstruction(chatId, 'ERROR', `Git sync failed: ${e.message}`);
    }

    if (messageId) {
      await db.collection('queue').doc(messageId).delete();
      logInstruction(chatId, 'GEMINI', `Queue task ${messageId} removed.`);
    }

  } catch (error: any) {
    if (error.status === 503 || error.message?.includes('503') || error.message?.includes('high demand')) {
      logInstruction(chatId, 'ERROR', "Gemini 503. Queueing...");
      if (!messageId) {
        await db.collection('queue').add({
          userMessage,
          chatId,
          createdAt: FieldValue.serverTimestamp(),
          attempts: 1
        });
        await safeSendMessage(chatId, "⚠️ Gemini is busy right now. I've queued your request!");
      } else {
        await db.collection('queue').doc(messageId).update({
          attempts: FieldValue.increment(1),
          lastAttempt: FieldValue.serverTimestamp()
        });
      }
    } else {
      logInstruction(chatId, 'ERROR', `Gemini Error: ${error.message}`);
      await safeSendMessage(chatId, "❌ Error: " + error.message);
      if (messageId) await db.collection('queue').doc(messageId).delete();
    }
  }
}

async function checkQueue(repoRoot: string) {
  const snapshot = await db.collection('queue').orderBy('createdAt', 'asc').limit(1).get();
  if (snapshot.empty) return;

  const doc = snapshot.docs[0];
  const data = doc.data();
  logInstruction(data.chatId, 'GEMINI', `Retrying queued message...`);
  await processOneMessage(data.userMessage, data.chatId, repoRoot, doc.id);
}

async function run() {
  const isPolling = process.argv.includes('--poll');
  const repoRoot = process.cwd();

  printHeader();

  setInterval(() => checkQueue(repoRoot), 60000);

  if (isPolling) {
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
