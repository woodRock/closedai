import { execSync } from 'child_process';
import { db } from '../services/firebase.js';
import { logInstruction } from '../utils/logger.js';

export async function handleSystemCommands(userMessage: string, chatId: number, repoRoot: string, safeSendMessage: (chatId: number, text: string) => Promise<any>): Promise<boolean> {
  const parts = userMessage.trim().split(/\s+/);
  const cmd = parts[0]!.toLowerCase();
  
  if (cmd === '/log') {
    const limitArg = parts[1];
    const limit = limitArg ? parseInt(limitArg) : 10;
    const finalLimit = isNaN(limit) ? 10 : Math.min(Math.max(limit, 1), 50);

    logInstruction(chatId, 'CMD', `Executing /log (limit: ${finalLimit})`);
    const snapshot = await db.collection('history').orderBy('timestamp', 'desc').limit(finalLimit).get();
    if (snapshot.empty) {
      await safeSendMessage(chatId, "No history found.");
      return true;
    }
    let response = `📜 *Recent Activity (Last ${finalLimit}):*\n\n`;
    snapshot.docs.reverse().forEach(doc => {
      const data = doc.data();
      const date = data.timestamp?.toDate().toLocaleTimeString() || 'unknown';
      const role = data.role === 'model' ? '🤖' : '👤';
      
      let text = '';
      if (data.text) {
        text = data.text;
      } else if (data.parts && Array.isArray(data.parts)) {
        text = data.parts.map((p: any) => p.text || (p.functionCall ? `[Tool: ${p.functionCall.name}]` : p.functionResponse ? `[Result: ${p.functionResponse.name}]` : '')).join(' ');
      }

      const displayRef = text.length > 30 ? text.substring(0, 30) + '...' : text;
      response += `\`[${date}]\` ${role} **${data.chatId}**: ${displayRef}\n`;
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

  if (cmd === '/git') {
    logInstruction(chatId, 'CMD', 'Executing /git');
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoRoot }).toString().trim();
      const status = execSync('git status --short', { cwd: repoRoot }).toString().trim() || 'Clean';
      await safeSendMessage(chatId, `🎋 *Git Info*\n\n*Branch:* ${branch}\n*Status:*\n\`\`\`\n${status}\n\`\`\``);
    } catch (e: any) {
      await safeSendMessage(chatId, "❌ Failed to fetch git info: " + e.message);
    }
    return true;
  }

  if (cmd === '/status') {
    logInstruction(chatId, 'CMD', 'Executing /status');
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    let gitHash = 'unknown';
    try {
      gitHash = execSync('git rev-parse --short HEAD', { cwd: repoRoot }).toString().trim();
    } catch {}

    let diskUsage = 'unknown';
    try {
      diskUsage = execSync('df -h . | tail -1 | awk \'{print $5}\'', { cwd: repoRoot }).toString().trim();
    } catch {}

    const response = `✅ *System Status*\n\n` +
      `⏱ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
      `💾 *Disk Usage:* ${diskUsage}\n` +
      `📦 *Version:* \`${gitHash}\`\n` +
      `⚙️ *Mode:* ${process.argv.includes('--poll') ? "Polling" : "Batch"}\n` +
      `📂 *Root:* \`${repoRoot}\``;
    
    await safeSendMessage(chatId, response);
    return true;
  }

  if (cmd === '/stats') {
    logInstruction(chatId, 'CMD', 'Executing /stats');
    const snapshot = await db.collection('history').get();
    const total = snapshot.size;
    const userCounts: Record<string, number> = {};
    let modelCount = 0;
    let userCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const cid = data.chatId;
      if (data.role === 'model') {
          modelCount++;
      } else {
          userCount++;
          userCounts[cid] = (userCounts[cid] || 0) + 1;
      }
    });

    let response = `📊 *Usage Statistics*\n\n` +
      `Total Log Entries: ${total}\n` +
      `👤 User Messages: ${userCount}\n` +
      `🤖 Bot Responses: ${modelCount}\n` +
      `Unique Users: ${Object.keys(userCounts).length}\n\n` +
      `*User Activity:*\n`;
    
    for (const [id, count] of Object.entries(userCounts)) {
      response += `• \`${id}\`: ${count}\n`;
    }
    
    await safeSendMessage(chatId, response);
    return true;
  }

  if (cmd === '/ping') {
    logInstruction(chatId, 'CMD', 'Executing /ping');
    await safeSendMessage(chatId, "🏓 Pong!");
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

  if (cmd === '/restart') {
    logInstruction(chatId, 'CMD', 'Executing /restart');
    await safeSendMessage(chatId, "🔄 Restarting bot...");
    setTimeout(() => {
      process.exit(0);
    }, 1000);
    return true;
  }

  if (cmd === '/help') {
    const response = `🤖 *ClosedAI Help*\n\n` +
      `/status - Show system status & disk usage\n` +
      `/stats - Show usage statistics\n` +
      `/log [n] - Show last n messages (default 10)\n` +
      `/git - Show git branch & status\n` +
      `/gitlog - Show last 5 git commits\n` +
      `/queue - Show queued tasks\n` +
      `/ping - Check if bot is alive\n` +
      `/restart - Restart the bot process\n` +
      `/help - Show this message\n\n` +
      `Any other message will be processed by Gemini.`;
    await safeSendMessage(chatId, response);
    return true;
  }

  return false;
}
