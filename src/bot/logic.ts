import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { db, FieldValue } from '../services/firebase.js';
import { model, genAI } from '../services/gemini.js';
import { bot } from './instance.js';
import { logInstruction } from '../utils/logger.js';
import { handleSystemCommands } from './commands.js';
import { executeTool } from '../tools/index.js';

const MAX_MESSAGE_LENGTH = 4000;

export async function safeSendMessage(chatId: number, text: string) {
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

export async function processOneMessage(userMessage: string, chatId: number, repoRoot: string, messageId?: string) {
  const allowedUsers = (process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').map(s => s.trim()).filter(id => id.length > 0);
  if (allowedUsers.length > 0 && !allowedUsers.includes(chatId.toString())) {
    await safeSendMessage(chatId, "🛡️ Access Denied.");
    logInstruction(chatId, 'ERROR', 'Unauthorized access attempt.');
    return;
  }

  await db.collection('history').add({
    chatId,
    text: userMessage,
    timestamp: FieldValue.serverTimestamp()
  });

  if (userMessage.startsWith('/')) {
    const handled = await handleSystemCommands(userMessage, chatId, repoRoot, safeSendMessage);
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
        console.log(`   👉 Tool Call: ${name}(${JSON.stringify(args)})`);
        const content = await executeTool(name, args, repoRoot, chatId, safeSendMessage);
        functionResponses.push({ functionResponse: { name, response: content } });
      }
      
      turn++;
      logInstruction(chatId, 'GEMINI', `Turn ${turn}/10 completed. Requesting next step...`);
      result = await chat.sendMessage(functionResponses);
    }
    logInstruction(chatId, 'GEMINI', 'Request sequence finished.');

    try {
      execSync('git add .', { cwd: repoRoot });
      const diff = execSync('git diff --cached', { cwd: repoRoot }).toString();
      
      if (diff.length > 0) {
        let commitMsg = "ClosedAI: Automatic update";
        try {
          const simpleModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `Generate a concise, meaningful git commit message for the following changes. Only return the message text, nothing else. Focus on WHAT changed and WHY if possible.\n\n${diff.substring(0, 5000)}`;
          const result = await simpleModel.generateContent(prompt);
          const text = result.response.text().trim();
          if (text) {
            commitMsg = text.replace(/^["']|["']$/g, '');
          }
        } catch (genErr) {
          logInstruction(chatId, 'ERROR', `Failed to generate meaningful commit message: ${genErr}`);
        }
        
        execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}" && git push`, { cwd: repoRoot });
        logInstruction(chatId, 'SHELL', `Git push completed with message: ${commitMsg}`);
      }
    } catch (e: any) {
      logInstruction(chatId, 'ERROR', `Git sync failed: ${e.message}`);
    }

    if (messageId) {
      await db.collection('queue').doc(messageId).delete().catch(() => {});
      console.log(`✅ Queue task ${messageId} completed and removed.`);
    }

  } catch (error: any) {
    if (error.status === 503 || error.message?.includes('503') || error.message?.includes('high demand')) {
      logInstruction(chatId, 'ERROR', "Gemini 503. Queueing...");
      if (!messageId) {
        await db.collection('queue').add({
          userMessage,
          chatId,
          createdAt: FieldValue.serverTimestamp(),
          attempts: 1,
          status: 'pending'
        });
        await safeSendMessage(chatId, "⚠️ Gemini is busy right now. I've queued your request!");
      } else {
        await db.collection('queue').doc(messageId).set({
          attempts: FieldValue.increment(1),
          lastAttempt: FieldValue.serverTimestamp(),
          status: 'pending' 
        }, { merge: true }).catch(() => {});
      }
    } else {
      logInstruction(chatId, 'ERROR', `Gemini Error: ${error.message}`);
      await safeSendMessage(chatId, "❌ Error: " + error.message);
      if (messageId) await db.collection('queue').doc(messageId).delete().catch(() => {}); 
    }
  }
}

export async function checkQueue(repoRoot: string) {
  const snapshot = await db.collection('queue')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get();
    
  if (snapshot.empty) return;

  const doc = snapshot.docs[0];
  const data = doc.data();
  
  await doc.ref.update({ status: 'processing', lastAttempt: FieldValue.serverTimestamp() });
  
  console.log(`🔄 Retrying queued message from ${data.chatId}...`);
  try {
    await processOneMessage(data.userMessage, data.chatId, repoRoot, doc.id);
  } catch (err) {
    console.error(`Error during queue retry for ${doc.id}:`, err);
    await doc.ref.update({ status: 'pending' }).catch(() => {});
  }
}
