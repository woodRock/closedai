import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Telegraf } from 'telegraf';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// 1. Initialize Firebase with trimmed secrets
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || '{}';
const serviceAccount = JSON.parse(serviceAccountString);
if (!serviceAccount.project_id) {
  console.error('FIREBASE_SERVICE_ACCOUNT is missing or invalid.');
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
      }
    ]
  }
];

// 3. Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim() || '');
const model = genAI.getGenerativeModel({ 
  model: "gemini-3-flash-preview",
  tools: tools,
});

// 4. Initialize Telegram
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN?.trim() || '');

const MAX_MESSAGE_LENGTH = 4000;
async function safeSendMessage(chatId: number, text: string) {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return bot.telegram.sendMessage(chatId, text);
  }
  const truncated = text.substring(0, MAX_MESSAGE_LENGTH) + "\n\n... (message truncated)";
  return bot.telegram.sendMessage(chatId, truncated);
}

async function processOneMessage(userMessage: string, chatId: number, repoRoot: string) {
  const allowedUsers = (process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').map(s => s.trim()).filter(id => id.length > 0);
  if (allowedUsers.length > 0 && !allowedUsers.includes(chatId.toString())) {
    await bot.telegram.sendMessage(chatId, "Sorry, you are not authorized.");
    return;
  }

  console.log(`Processing message from ${chatId}: ${userMessage}`);

  const fileStructure = execSync('find . -maxdepth 2 -not -path "*/.*"').toString();
  const packageJson = fs.existsSync('package.json') ? fs.readFileSync('package.json', 'utf-8') : 'Not found';
  
  const systemPrompt = `
    You are ClosedAI, a secure agent.
    Current Directory: ${repoRoot}
    
    FILE STRUCTURE:
    ${fileStructure}
    
    KEY FILE (package.json):
    ${packageJson}
    
    Instructions:
    - Use the provided tools to fulfill the user's request.
    - If you can fulfill the request in one turn (e.g., you already know what to write), do it.
    - If you need more info, use read_file or run_shell.
    - When finished, provide a final summary of your actions to the user.
  `;

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I am ready to help with the repository." }] }
    ],
  });

  try {
    let result = await chat.sendMessage(userMessage);
    let turn = 0;

    while (turn < 10) {
      const response = result.response;
      const calls = response.functionCalls();

      if (!calls || calls.length === 0) {
        // No more tool calls, send the final text response
        const text = response.text();
        if (text) await safeSendMessage(chatId, text);
        break;
      }

      console.log(`--- Turn ${turn + 1}: ${calls.length} function call(s) ---`);
      const functionResponses = [];

      for (const call of calls) {
        const { name, args } = call;
        let content;

        try {
          if (name === "write_file") {
            const fullPath = path.join(repoRoot, (args as any).path);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, (args as any).content);
            content = { result: `Success: Wrote to ${(args as any).path}` };
            console.log(`Wrote file: ${(args as any).path}`);
          } else if (name === "read_file") {
            const fullPath = path.join(repoRoot, (args as any).path);
            const data = fs.readFileSync(fullPath, "utf-8");
            content = { result: data };
            console.log(`Read file: ${(args as any).path}`);
          } else if (name === "run_shell") {
            const output = execSync((args as any).command).toString();
            content = { result: output };
            console.log(`Ran command: ${(args as any).command}`);
          }
        } catch (e: any) {
          content = { error: e.message };
          console.error(`Tool error (${name}):`, e.message);
        }

        functionResponses.push({
          functionResponse: { name, response: content }
        });
      }

      // Send the results back to the model
      result = await chat.sendMessage(functionResponses);
      turn++;
    }

    // Git commit/push logic
    try {
      const status = execSync('git status --porcelain').toString();
      if (status.length > 0) {
        execSync('git add . && git commit -m "ClosedAI: Automatic update" && git push');
        console.log("Changes committed and pushed.");
      }
    } catch (e) {
      console.error("Git failed:", e);
    }

  } catch (error: any) {
    console.error('Gemini Error:', error);
    await safeSendMessage(chatId, "Error: " + error.message);
  }
}

async function run() {
  const isPolling = process.argv.includes('--poll');
  const repoRoot = process.cwd();

  if (isPolling) {
    console.log("🚀 Starting in Long Polling mode...");
    bot.on('message', async (ctx) => {
      if (ctx.message && 'text' in ctx.message) {
        await processOneMessage(ctx.message.text, ctx.chat.id, repoRoot);
      }
    });
    bot.launch();
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
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
