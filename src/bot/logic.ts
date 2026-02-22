import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { db, FieldValue } from '../services/firebase.js';
import { model, genAI } from '../services/gemini.js';
import { bot } from './instance.js';
import { logInstruction } from '../utils/logger.js';
import { handleSystemCommands } from './commands.js';
import { executeTool } from '../tools/index.js';
import { getConfig } from '../utils/config.js';
import { GoogleGenerativeAIError } from '@google/generative-ai';

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

async function generateCommitMessage(diff: string, chatId: number): Promise<string> {
  if (!diff || diff.trim().length === 0) {
    return "ClosedAI: Minor updates";
  }
  try {
    // User requested gemini-3-flash-preview specifically for commit messages
    const messageModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `Generate a concise, one-line meaningful git commit message for the following changes. 
Do not use markdown formatting. Return ONLY the commit message text.

Diff:
${diff.substring(0, 15000)}`;
    const result = await messageModel.generateContent(prompt);
    const text = result.response.text().trim();
    if (!text) throw new Error("Empty response from Gemini");
    return text.replace(/^["']|["']$/g, '').replace(/^Commit:\s*/i, '');
  } catch (error: any) {
    logInstruction(chatId, 'ERROR', `Error generating commit message: ${error.message}`);
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
    
    // Ensure we don't send unsupported MIME types in history
    const sanitizedParts = parts.map((p: any) => {
      if (p.inlineData && p.inlineData.mimeType === 'application/octet-stream') {
        return { ...p, inlineData: { ...p.inlineData, mimeType: 'image/jpeg' } };
      }
      return p;
    });
    
    history.push({ role, parts: sanitizedParts });
  }

  return history;
}

export async function processOneMessage(
  userMessage: string, 
  chatId: number, 
  repoRoot: string, 
  messageId?: string,
  media?: { data: string, mimeType: string }, // data is base64 string
  isPolling: boolean = false
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

  const userParts: any[] = [{ text: userMessage || (media ? "Explain this media." : "") }];
  if (media) {
    userParts.push({
      inlineData: {
        data: media.data,
        mimeType: media.mimeType
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

  logInstruction(chatId, 'GEMINI', `Processing: ${userMessage ? userMessage.substring(0, 50) : (media ? media.mimeType : 'Unknown')}${userMessage && userMessage.length > 50 ? '...' : ''}`);
  
  const isGitRepo = fs.existsSync(path.join(repoRoot, '.git'));
  if (isGitRepo) {
    try {
      execSync('git config user.name "ClosedAI Bot"', { cwd: repoRoot });
      execSync('git config user.email "bot@closedai.local"', { cwd: repoRoot });
    } catch (e) {
      logInstruction(chatId, 'ERROR', `Failed to config git: ${e}`);
    }
  }

  await bot.telegram.sendChatAction(chatId, 'typing').catch(() => {});

  const fileStructure = execSync('find . -maxdepth 2 -not -path "*/.*"', { cwd: repoRoot }).toString();
  const packageJson = fs.existsSync(path.join(repoRoot, 'package.json')) 
    ? fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8') 
    : 'Not found';
  
  const envContext = isPolling 
    ? "ENVIRONMENT: Local Runner (Polling Mode). File changes are PERSISTENT between messages. You can continue work incrementally."
    : "ENVIRONMENT: GitHub Action (Batch Mode). Environment is EPHEMERAL. Uncommitted changes are LOST between message processing runs. You must commit/push if you want to save state across messages.";

  const systemPrompt = `You are ClosedAI, a senior software engineer assistant.
Current Directory: ${repoRoot}
Structure: ${fileStructure}
package.json: ${packageJson}
${envContext}

CRITICAL RULES:
1. FOCUS: Focus exclusively on the latest user request.
2. CONTEXT: The chat history contains previous tasks. If a task is already completed (indicated by "Success" messages), DO NOT repeat it.
3. EFFICIENCY: Complete the task in 10 actions or less.
4. IDENTITY: Do not search for your own name or model version unless specifically asked.
5. NO REPETITION: If a tool call has already been made with specific arguments and succeeded, do not repeat it unless the outcome needs to be different.
6. COMMUNICATION: Speak directly to the user. Do not use a "reply" tool; just output your text response. If you have already provided a final summary in a previous turn, do not repeat it.

Ready to assist.`;

  const currentHistory = [
    { role: "user", parts: [{ text: "Initialize system." }] },
    { role: "model", parts: [{ text: systemPrompt }] },
    ...geminiHistory
  ].map(turn => ({
    ...turn,
    parts: turn.parts.map((p: any) => {
      if (p.inlineData && p.inlineData.mimeType === 'application/octet-stream') {
        return { ...p, inlineData: { ...p.inlineData, mimeType: 'image/jpeg' } };
      }
      return p;
    })
  }));

  currentHistory.push({ role: 'user', parts: userParts });

  try {
    logInstruction(chatId, 'GEMINI', 'Starting interaction...');
    let turn = 0;

    while (turn < 10) {
      const turnNumber = turn + 1;
      const turnIndicator = `🔄 *Turn ${turnNumber}/10*`;
      await safeSendMessage(chatId, turnIndicator);

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
        } else if (normalizedName === 'patch_file') {
          actionMsg += ` on \`${args.path}\``;
        } else if (normalizedName === 'read_file') {
          actionMsg += ` \`${args.path}\``;
        } else if (normalizedName === 'list_directory') {
          actionMsg += ` \`${args.path || '.'}\``;
        }
        
        await safeSendMessage(chatId, actionMsg);

        const content = await executeTool(name, args, repoRoot, chatId, safeSendMessage);
        
        if (normalizedName === 'patch_file' && content.result && !content.error) {
          const diff = content.result.split('\n\n')[1] || content.result;
          await safeSendMessage(chatId, `✅ *Patched:* \`${args.path}\`\n\`\`\`diff\n${diff}\n\`\`\``);
        }

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

    if (isGitRepo) {
      try {
        const status = execSync('git status --porcelain', { cwd: repoRoot }).toString();
        if (status.length > 0) {
          const statusMsg = await safeSendMessage(chatId, "📦 *Committing changes...*");
          
          execSync('git add .', { cwd: repoRoot });
          const diff = execSync('git diff --cached', { cwd: repoRoot }).toString();
          const commitMsg = await generateCommitMessage(diff, chatId);
          execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: repoRoot });
          
          if (statusMsg) {
            await bot.telegram.editMessageText(chatId, statusMsg.message_id, undefined, "🚀 *Pushing to GitHub...*", { parse_mode: 'Markdown' }).catch(() => {});
          }

          execSync(`git push origin HEAD`, { cwd: repoRoot });
          
          logInstruction(chatId, 'SHELL', `Git push completed: ${commitMsg}`);
          const finalMsg = `✅ *Changes committed & pushed:*\n\`${commitMsg}\``;
          
          if (statusMsg) {
             await bot.telegram.editMessageText(chatId, statusMsg.message_id, undefined, finalMsg, { parse_mode: 'Markdown' }).catch(() => safeSendMessage(chatId, finalMsg));
          } else {
             await safeSendMessage(chatId, finalMsg);
          }
        }
      } catch (e: any) {
        logInstruction(chatId, 'ERROR', `Git operation failed: ${e.message}`);
        await safeSendMessage(chatId, `⚠️ *Git Push Failed:* ${e.message}`);
      }
    }

    if (messageId) {
      await db.collection('queue').doc(messageId).delete().catch(() => {});
    }

  } catch (error: any) {
    logInstruction(chatId, 'ERROR', `Error: ${error.message}`);
    
    // Broaden error detection for overloaded/503/504 errors
    const isOverloaded = 
      error instanceof GoogleGenerativeAIError ||
      error.status === 503 || 
      error.status === 504 ||
      error.status === 429 ||
      error.message?.includes('503') || 
      error.message?.includes('504') ||
      error.message?.includes('429') ||
      error.message?.toLowerCase().includes('overloaded') ||
      error.message?.toLowerCase().includes('service unavailable') ||
      error.message?.toLowerCase().includes('deadline exceeded') ||
      error.message?.toLowerCase().includes('socket hang up') ||
      error.message?.toLowerCase().includes('fetch failed');

    if (isOverloaded && !messageId) {
      await db.collection('queue').add({
        chatId,
        userMessage,
        media,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp()
      });
      await safeSendMessage(chatId, "⏳ Gemini is overloaded or unavailable. Your request has been queued and will be retried automatically.");
    } else {
      await safeSendMessage(chatId, "❌ Error: " + error.message);
    }
  }
}

export async function checkQueue(repoRoot: string, isPolling: boolean = false) {
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
    await processOneMessage(data.userMessage, data.chatId, repoRoot, doc.id, data.media || data.image, isPolling);
  } catch (err) {
    await doc.ref.update({ status: 'pending' }).catch(() => {});
  }
}
