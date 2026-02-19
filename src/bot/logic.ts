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

async function generateCommitMessage(diff: string): Promise<string> {
  try {
    const messageModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `Generate a concise, one-line meaningful git commit message for the following changes. 
Do not use markdown formatting. Return ONLY the commit message text.

Diff:
${diff.substring(0, 10000)}`;
    const result = await messageModel.generateContent(prompt);
    const text = result.response.text().trim();
    return text.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating commit message:', error);
    return "ClosedAI: Automatic update";
  }
}

async function getChatHistory(chatId: number, limit = 20) {
  const snapshot = await db.collection('history')
    .where('chatId', '==', chatId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  const docs = snapshot.docs.reverse();
  const history: any[] = [];
  let lastRole = 'model';

  for (const doc of docs) {
    const data = doc.data();
    const role = data.role === 'model' ? 'model' : 'user';
    if (role !== lastRole) {
      history.push({
        role,
        parts: [{ text: data.text }]
      });
      lastRole = role;
    }
  }

  return history;
}

export async function processOneMessage(userMessage: string, chatId: number, repoRoot: string, messageId?: string) {
  const allowedUsers = (process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').map(s => s.trim()).filter(id => id.length > 0);
  if (allowedUsers.length > 0 && !allowedUsers.includes(chatId.toString())) {
    await safeSendMessage(chatId, "🛡️ Access Denied.");
    logInstruction(chatId, 'ERROR', 'Unauthorized access attempt.');
    return;
  }

  const pastHistory = await getChatHistory(chatId);

  await db.collection('history').add({
    chatId,
    role: 'user',
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
      { role: "model", parts: [{ text: "Ready." }] },
      ...pastHistory
    ],
  });

  try {
    logInstruction(chatId, 'GEMINI', 'Starting interaction...');
    let result = await chat.sendMessageStream(userMessage);
    let turn = 0;

    while (turn < 10) {
      let fullText = '';
      let functionCalls: any[] = [];
      let telegramMessage: any = null;
      let lastSentLength = 0;
      let updateTimer: NodeJS.Timeout | null = null;

      const updateTelegram = async (final = false) => {
        if (!fullText.trim() || fullText.length === lastSentLength) return;
        try {
          if (!telegramMessage) {
            telegramMessage = await safeSendMessage(chatId, fullText);
          } else {
            await bot.telegram.editMessageText(chatId, telegramMessage.message_id, undefined, fullText, { parse_mode: 'Markdown' });
          }
          lastSentLength = fullText.length;
        } catch (e: any) {
          if (!e.description?.includes('message is not modified')) {
             // fallback to plain text if markdown fails
             try { await bot.telegram.editMessageText(chatId, telegramMessage?.message_id, undefined, fullText); } catch {}
          }
        }
      };

      for await (const chunk of result.stream) {
        const calls = chunk.functionCalls();
        if (calls && calls.length > 0) {
          functionCalls.push(...calls);
        } else {
          try {
            fullText += chunk.text();
            if (!updateTimer) {
              updateTimer = setTimeout(async () => {
                await updateTelegram();
                updateTimer = null;
              }, 1000);
            }
          } catch {}
        }
      }

      if (updateTimer) clearTimeout(updateTimer);
      await updateTelegram(true);

      if (functionCalls.length === 0) {
        if (fullText) {
          logInstruction(chatId, 'GEMINI', 'Final response sent.');
          await db.collection('history').add({
            chatId,
            role: 'model',
            text: fullText,
            timestamp: FieldValue.serverTimestamp()
          });
        }
        break;
      }

      // Handle function calls
      const functionResponses = [];
      for (const call of functionCalls) {
        const { name, args } = call;
        console.log(`   👉 Tool Call: ${name}(${JSON.stringify(args)})`);
        const content = await executeTool(name, args, repoRoot, chatId, safeSendMessage);
        functionResponses.push({ functionResponse: { name, response: content } });
      }
      
      turn++;
      logInstruction(chatId, 'GEMINI', `Turn ${turn}/10 completed. Requesting next step...`);
      result = await chat.sendMessageStream(functionResponses);
    }
    logInstruction(chatId, 'GEMINI', 'Request sequence finished.');

    // Git sync...
    try {
      const status = execSync('git status --porcelain', { cwd: repoRoot }).toString();
      if (status.length > 0) {
        execSync('git add .', { cwd: repoRoot });
        const diff = execSync('git diff --cached', { cwd: repoRoot }).toString();
        const commitMsg = await generateCommitMessage(diff);
        execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}" && git push`, { cwd: repoRoot });
        logInstruction(chatId, 'SHELL', `Git push completed: ${commitMsg}`);
      }
    } catch (e: any) {}

    if (messageId) {
      await db.collection('queue').doc(messageId).delete().catch(() => {});
    }

  } catch (error: any) {
    // Error handling...
    logInstruction(chatId, 'ERROR', `Error: ${error.message}`);
    await safeSendMessage(chatId, "❌ Error: " + error.message);
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
  try {
    await processOneMessage(data.userMessage, data.chatId, repoRoot, doc.id);
  } catch (err) {
    await doc.ref.update({ status: 'pending' }).catch(() => {});
  }
}
