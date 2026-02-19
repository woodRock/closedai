import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

// 2. Initialize Gemini with trimmed API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim() || '');
const model = genAI.getGenerativeModel({ 
  model: "gemini-3-flash-preview",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

// 3. Initialize Telegram with trimmed token
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN?.trim() || '');

const MAX_MESSAGE_LENGTH = 4000;
async function safeSendMessage(chatId: number, text: string) {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return bot.telegram.sendMessage(chatId, text);
  }
  
  const truncated = text.substring(0, MAX_MESSAGE_LENGTH) + "\n\n... (message truncated due to length)";
  return bot.telegram.sendMessage(chatId, truncated);
}

async function processOneMessage(userMessage: string, chatId: number, repoRoot: string) {
  // Whitelist check
  const allowedUsers = (process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').map(s => s.trim()).filter(id => id.length > 0);
  if (allowedUsers.length > 0 && !allowedUsers.includes(chatId.toString())) {
    console.log(`Unauthorized access attempt from chat ID: ${chatId}`);
    await bot.telegram.sendMessage(chatId, "Sorry, you are not authorized to use this bot.");
    return;
  }

  console.log(`Processing message from ${chatId}: ${userMessage}`);

  // Provide context to Gemini
  const fileStructure = execSync('find . -maxdepth 3 -not -path "*/.*"').toString();
  
  const systemPrompt = `
    You are ClosedAI, a secure agent running inside a GitHub Action or as a local bot. 
    Your goal is to fulfill the user's request by modifying files, running commands, or answering questions.
    Current Directory: ${repoRoot}
    File Structure:
    ${fileStructure}

    RESPONSE FORMAT:
    You must return your response as a JSON array of actions.
    Available actions:
    - { "action": "WRITE_FILE", "path": "relative/path", "content": "file content" }
    - { "action": "READ_FILE", "path": "relative/path" }
    - { "action": "RUN_SHELL", "command": "shell command" }
    - { "action": "REPLY", "text": "message to user" }

    If the user asks a question that doesn't require repo changes, simply use the "REPLY" action.
    If you need to see the content of a file before modifying it, use READ_FILE first.
    Return ONLY the JSON array. Do not include any explanation or markdown backticks.
  `;

  try {
    const result = await model.generateContent([systemPrompt, userMessage]);
    const responseText = result.response.text();
    console.log(`--- Gemini Response ---\n${responseText}\n-----------------------`);
    
    let actions: any[];
    try {
      actions = JSON.parse(responseText);
    } catch (e) {
      // Fallback for non-JSON responses or markdown-wrapped JSON
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        try {
          actions = JSON.parse(jsonStr);
        } catch (innerError: any) {
          // If it still fails, it might be due to trailing characters in the match
          const lastBracket = jsonStr.lastIndexOf(']');
          if (lastBracket !== -1) {
            actions = JSON.parse(jsonStr.substring(0, lastBracket + 1));
          } else {
            throw innerError;
          }
        }
      } else {
        // Not a JSON response, maybe it's just a text reply
        console.log("No JSON structure found, treating as plain text reply.");
        await safeSendMessage(chatId, responseText);
        return;
      }
    }
    
    console.log(`Parsed ${Array.isArray(actions) ? actions.length : 0} actions.`);
    
    if (Array.isArray(actions)) {
      for (const action of actions) {
        if (action.action === 'WRITE_FILE') {
          const fullPath = path.join(repoRoot, action.path);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, action.content);
          console.log(`Wrote file: ${action.path}`);
        } else if (action.action === 'READ_FILE') {
          const fullPath = path.join(repoRoot, action.path);
          if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            await safeSendMessage(chatId, `Content of ${action.path}:\n\`\`\`\n${content}\n\`\`\``);
          } else {
            await bot.telegram.sendMessage(chatId, `File ${action.path} not found.`);
          }
        } else if (action.action === 'RUN_SHELL') {
          console.log(`Running: ${action.command}`);
          try {
            const output = execSync(action.command).toString();
            if (output) await safeSendMessage(chatId, `Output:\n\`\`\`\n${output}\n\`\`\``);
          } catch (e: any) {
            await bot.telegram.sendMessage(chatId, `Error: ${e.message}`);
          }
        } else if (action.action === 'REPLY') {
          await bot.telegram.sendMessage(chatId, action.text);
        }
      }
    } else {
      await safeSendMessage(chatId, responseText);
    }

    // Commit changes if any
    try {
      const status = execSync('git status --porcelain').toString();
      if (status.length > 0) {
        console.log("Changes detected. Committing...");
        execSync('git add .');
        execSync('git commit -m "ClosedAI: Automatic update from bot"');
        execSync('git push');
      } else {
        console.log("No changes detected in the repository.");
      }
    } catch (e) {
      console.error("Git operation failed:", e);
    }

  } catch (error: any) {
    console.error('Error during Gemini processing:', error);
    if (error.cause) console.error('Error cause:', error.cause);
    await safeSendMessage(chatId, "Error: " + error.message + (error.cause ? ` (${error.cause})` : ""));
  }
}

async function run() {
  const isPolling = process.argv.includes('--poll');
  const repoRoot = process.cwd();

  if (isPolling) {
    console.log("🚀 Starting in Long Polling mode (Instant replies)...");
    bot.on('message', async (ctx) => {
      if (ctx.message && 'text' in ctx.message) {
        await processOneMessage(ctx.message.text, ctx.chat.id, repoRoot);
      }
    });
    bot.launch();
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    return;
  }

  // Fallback for GitHub Actions (Cron)
  const lastProcessedRef = db.collection('config').doc('last_processed');
  const doc = await lastProcessedRef.get();
  let lastUpdateId = doc.exists ? doc.data()?.update_id || 0 : 0;

  // Poll Telegram for updates
  const updates = await bot.telegram.getUpdates(100, 100, lastUpdateId + 1, ['message']);
  
  if (updates.length === 0) {
    console.log('No new messages.');
    return;
  }

  for (const update of updates) {
    if ('message' in update && update.message && 'text' in (update.message as any)) {
      const message = update.message as any;
      await processOneMessage(message.text, message.chat.id, repoRoot);
      lastUpdateId = update.update_id;
    }
  }

  // Update last processed ID in Firebase
  await lastProcessedRef.set({ update_id: lastUpdateId });
}

run().catch(console.error);
