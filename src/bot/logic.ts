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

  for (const doc of docs) {
    const data = doc.data();
    const parts = data.parts || (data.text ? [{ text: data.text }] : []);
    if (parts.length === 0) continue;

    let role = data.role;
    const hasFunctionResponse = parts.some((p: any) => p.functionResponse);
    const hasFunctionCall = parts.some((p: any) => p.functionCall);

    if (hasFunctionResponse) {
      role = 'user';
    } else if (hasFunctionCall || role === 'model') {
      role = 'model';
    } else {
      role = 'user';
    }
    
    history.push({ role, parts });
  }

  return history;
}

export async function processOneMessage(
  userMessage: string, 
  chatId: number, 
  repoRoot: string, 
  messageId?: string,
  image?: { data: string, mimeType: string } // data is base64 string
) {
  const allowedUsers = (process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').map(s => s.trim()).filter(id => id.length > 0);
  if (allowedUsers.length > 0 && !allowedUsers.includes(chatId.toString())) {
    await safeSendMessage(chatId, "🛡️ Access Denied.");
    logInstruction(chatId, 'ERROR', 'Unauthorized access attempt.');
    return;
  }

  const history = await getChatHistory(chatId);
  const geminiHistory = [...history];
  
  while (geminiHistory.length > 0 && geminiHistory[0].role !== 'user') {
    geminiHistory.shift();
  }
  
  if (geminiHistory.length > 0) {
    let last = geminiHistory[geminiHistory.length - 1];
    while (geminiHistory.length > 0) {
      last = geminiHistory[geminiHistory.length - 1];
      if (last.role === 'model') {
        const hasCalls = last.parts.some((p: any) => p.functionCall);
        if (hasCalls) {
          geminiHistory.pop();
          continue;
        }
        break;
      } else if (last.role === 'function') {
        break; 
      } else {
        break;
      }
    }
  }

  const userParts: any[] = [{ text: userMessage || (image ? "Explain this image." : "") }];
  if (image) {
    userParts.push({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType
      }
    });
  }

  await db.collection('history').add({
    chatId,
    role: 'user',
    parts: userParts,
    timestamp: FieldValue.serverTimestamp()
  });

  if (userMessage && userMessage.startsWith('/')) {
    const handled = await handleSystemCommands(userMessage, chatId, repoRoot, safeSendMessage);
    if (handled) return;
  }

  logInstruction(chatId, 'GEMINI', `Processing: ${userMessage ? userMessage.substring(0, 50) : 'Image'}${userMessage && userMessage.length > 50 ? '...' : ''}`);
  
  try {
    execSync('git config user.name "ClosedAI Bot"', { cwd: repoRoot });
    execSync('git config user.email "bot@closedai.local"', { cwd: repoRoot });
  } catch {}

  await bot.telegram.sendChatAction(chatId, 'typing').catch(() => {});

  const fileStructure = execSync('find . -maxdepth 2 -not -path "*/.*"', { cwd: repoRoot }).toString();
  const packageJson = fs.existsSync(path.join(repoRoot, 'package.json')) 
    ? fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8') 
    : 'Not found';
  
  const systemPrompt = `You are ClosedAI, a senior software engineer assistant.
Current Directory: ${repoRoot}
Structure: ${fileStructure}
package.json: ${packageJson}

CRITICAL RULES:
1. FOCUS: Focus exclusively on the latest user request.
2. CONTEXT: The chat history contains previous tasks. If a task is already completed (indicated by "Success" messages), DO NOT repeat it.
3. EFFICIENCY: Complete the task in 10 actions or less.
4. IDENTITY: Do not search for your own name or model version unless specifically asked.
5. NO REPETITION: If a tool call has already been made with specific arguments and succeeded, do not repeat it unless the outcome needs to be different.

Ready to assist.`;

  const currentHistory = [
    { role: "user", parts: [{ text: "Initialize system." }] },
    { role: "model", parts: [{ text: systemPrompt }] },
    ...geminiHistory
  ];

  currentHistory.push({ role: 'user', parts: userParts });

  try {
    logInstruction(chatId, 'GEMINI', 'Starting interaction...');
    let turn = 0;

    while (turn < 10) {
      let fullText = '';
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
             try { await bot.telegram.editMessageText(chatId, telegramMessage?.message_id, undefined, fullText); } catch {}
          }
        }
      };

      const result = await model.generateContentStream({ contents: currentHistory });
      const signatures: (string | undefined)[] = [];

      for await (const chunk of result.stream) {
        try {
          const chunkParts = chunk.candidates?.[0]?.content?.parts;
          if (chunkParts) {
            for (const part of chunkParts) {
              const sig = (part as any).thought_signature || (part as any).thoughtSignature;
              signatures.push(sig);
            }
          }

          const text = chunk.text();
          if (text) {
            fullText += text;
            if (!updateTimer) {
              updateTimer = setTimeout(async () => {
                await updateTelegram();
                updateTimer = null;
              }, 1000);
            }
          }
        } catch {}
      }

      if (updateTimer) clearTimeout(updateTimer);
      await updateTelegram(true);

      const response = await result.response;
      const modelTurnParts = response.candidates?.[0]?.content?.parts || [];

      if (modelTurnParts.length > 0) {
        for (let i = 0; i < modelTurnParts.length; i++) {
          const part = modelTurnParts[i] as any;
          if (signatures[i]) {
            part.thought_signature = signatures[i];
          }
          if (part.functionCall && !part.thought_signature) {
            part.thought_signature = "skip_thought_signature_validator";
          }
        }
      }

      if (modelTurnParts.length > 0) {
        await db.collection('history').add({
          chatId,
          role: 'model',
          parts: modelTurnParts,
          timestamp: FieldValue.serverTimestamp()
        });
        currentHistory.push({ role: 'model', parts: modelTurnParts });
      }

      const functionCalls = response.functionCalls();

      if (!functionCalls || functionCalls.length === 0) {
        break;
      }

      const functionResponses = [];
      for (const call of functionCalls) {
        const { name, args } = call;
        const normalizedName = name.replace(/^default_api:/, '');
        
        let actionMsg = `🛠️ *Executing:* \`${normalizedName}\``;
        if (normalizedName === 'run_shell') {
          actionMsg += `\n\`\`\`bash\n$ ${args.command}\n\`\`\``;
        } else if (normalizedName === 'write_file') {
          const lines = args.content.split('\n');
          const formatted = lines.map((l: string, i: number) => `${(i + 1).toString().padStart(3)} | ${l}`).join('\n');
          const lang = args.path.split('.').pop() || '';
          actionMsg += ` to \`${args.path}\`\n\n\`\`\`${lang}\n${formatted}\n\`\`\``;
        } else if (normalizedName === 'read_file') {
          actionMsg += ` \`${args.path}\``;
        } else if (normalizedName === 'list_directory') {
          actionMsg += ` \`${args.path || '.'}\``;
        }
        
        await safeSendMessage(chatId, actionMsg);

        const content = await executeTool(name, args, repoRoot, chatId, safeSendMessage);
        functionResponses.push({ functionResponse: { name, response: content } });
      }
      
      await db.collection('history').add({
        chatId,
        role: 'user',
        parts: functionResponses,
        timestamp: FieldValue.serverTimestamp()
      });
      currentHistory.push({ role: 'user', parts: functionResponses });

      turn++;
      logInstruction(chatId, 'GEMINI', `Turn ${turn}/10 completed. Requesting next step...`);
    }
    logInstruction(chatId, 'GEMINI', 'Request sequence finished.');

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
    logInstruction(chatId, 'ERROR', `Error: ${error.message}`);
    if ((error.status === 503 || error.message?.includes('503')) && !messageId) {
      await db.collection('queue').add({
        chatId,
        userMessage,
        image,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp()
      });
      await safeSendMessage(chatId, "⏳ Gemini is overloaded. Your request has been queued and will be retried automatically.");
    } else {
      await safeSendMessage(chatId, "❌ Error: " + error.message);
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
  try {
    await processOneMessage(data.userMessage, data.chatId, repoRoot, doc.id, data.image);
  } catch (err) {
    await doc.ref.update({ status: 'pending' }).catch(() => {});
  }
}
