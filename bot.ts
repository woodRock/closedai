import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Telegraf } from 'telegraf';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// 1. Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
if (!serviceAccount.project_id) {
  console.error('FIREBASE_SERVICE_ACCOUNT is missing or invalid.');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore(app);

// 2. Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// 3. Initialize Telegram (for sending replies)
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

async function run() {
  const repoRoot = process.cwd();
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
    if ('message' in update && 'text' in (update.message as any)) {
      const message = update.message as any;
      const userMessage = message.text;
      const chatId = message.chat.id;

      // Whitelist check
      const allowedUsers = (process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').filter(id => id.length > 0);
      if (allowedUsers.length > 0 && !allowedUsers.includes(chatId.toString())) {
        console.log(`Unauthorized access attempt from chat ID: ${chatId}`);
        await bot.telegram.sendMessage(chatId, "Sorry, you are not authorized to use this bot.");
        continue;
      }

      console.log(`Processing message from ${chatId}: ${userMessage}`);

      // Provide context to Gemini
      const fileStructure = execSync('find . -maxdepth 3 -not -path "*/.*"').toString();
      
      const systemPrompt = `
        You are ClosedAI, a secure agent running inside a GitHub Action. 
        Your goal is to fulfill the user's request by modifying files or running commands.
        Current Directory: ${repoRoot}
        File Structure:
        ${fileStructure}

        RESPONSE FORMAT:
        You must return your response as a list of actions in a JSON block.
        Available actions:
        - { "action": "WRITE_FILE", "path": "relative/path", "content": "file content" }
        - { "action": "READ_FILE", "path": "relative/path" }
        - { "action": "RUN_SHELL", "command": "shell command" }
        - { "action": "REPLY", "text": "message to user" }

        If you need to see the content of a file before modifying it, use READ_FILE first.
      `;

      try {
        const result = await model.generateContent([systemPrompt, userMessage]);
        const responseText = result.response.text();
        
        // Extract JSON from response
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const actions = JSON.parse(jsonMatch[1] || jsonMatch[0]);
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
                await bot.telegram.sendMessage(chatId, `Content of ${action.path}:\n\`\`\`\n${content}\n\`\`\``);
              } else {
                await bot.telegram.sendMessage(chatId, `File ${action.path} not found.`);
              }
            } else if (action.action === 'RUN_SHELL') {
              console.log(`Running: ${action.command}`);
              try {
                const output = execSync(action.command).toString();
                if (output) await bot.telegram.sendMessage(chatId, `Output:\n${output}`);
              } catch (e: any) {
                await bot.telegram.sendMessage(chatId, `Error: ${e.message}`);
              }
            } else if (action.action === 'REPLY') {
              await bot.telegram.sendMessage(chatId, action.text);
            }
          }
        } else {
          await bot.telegram.sendMessage(chatId, responseText);
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
        await bot.telegram.sendMessage(chatId, "Error: " + error.message);
      }

      lastUpdateId = update.update_id;
    }
  }

  // Update last processed ID in Firebase
  await lastProcessedRef.set({ update_id: lastUpdateId });
}

run().catch(console.error);
