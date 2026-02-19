import pc from 'picocolors';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { printHeader, logInstruction } from './src/utils/logger.js';
import { db } from './src/services/firebase.js';
import { bot } from './src/bot/instance.js';
import { processOneMessage, checkQueue } from './src/bot/logic.js';

// --- Validation ---
const REQUIRED_ENV = ['FIREBASE_SERVICE_ACCOUNT', 'GEMINI_API_KEY', 'TELEGRAM_BOT_TOKEN'];
for (const env of REQUIRED_ENV) {
  if (!process.env[env]) {
    console.error(pc.red(`❌ Missing required environment variable: ${env}`));
    process.exit(1);
  }
}

bot.catch((err: any) => {
  const msg = err.message || String(err);
  if (msg.includes('409: Conflict')) {
    logInstruction(0, 'INFO', 'Conflict: Another bot instance started. Gracefully exiting...');
    process.exit(0);
  }
  logInstruction(0, 'ERROR', `Telegraf error: ${msg}`);
});

async function run() {
  const isPolling = process.argv.includes('--poll');
  const repoRoot = process.cwd();

  // 1. Local Lock File Check
  const lockFile = path.resolve(repoRoot, '.bot.lock');
  if (fs.existsSync(lockFile)) {
    try {
      const pid = parseInt(fs.readFileSync(lockFile, 'utf8'), 10);
      process.kill(pid, 0); // Check if process exists
      logInstruction(0, 'INFO', `Bot is already running locally (PID: ${pid}). Skipping...`);
      return;
    } catch (e) {
      // Stale lock file
      try { fs.unlinkSync(lockFile); } catch (ignore) {}
    }
  }
  fs.writeFileSync(lockFile, process.pid.toString());

  const cleanup = () => {
    try { if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile); } catch (ignore) {}
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });

  // 2. Remote (Firebase) Heartbeat Check
  const botStatusRef = db.collection('config').doc('bot_status');
  const statusDoc = await botStatusRef.get();
  if (statusDoc.exists) {
    const data = statusDoc.data();
    const lastSeen = data?.last_seen?.toMillis?.() || 0;
    const now = Date.now();
    // If seen in the last 90 seconds, consider it running
    if (now - lastSeen < 90000) {
      logInstruction(0, 'INFO', `Another bot instance is active (last seen ${Math.round((now - lastSeen)/1000)}s ago). Skipping...`);
      cleanup();
      return;
    }
  }

  // Update heartbeat initially
  await botStatusRef.set({ last_seen: new Date() }, { merge: true });

  printHeader();

  if (isPolling) {
    // Background tasks
    setInterval(async () => {
      try {
        await checkQueue(repoRoot);
        // Update heartbeat every minute
        await botStatusRef.set({ last_seen: new Date() }, { merge: true });
      } catch (err) {
        console.error("Background Worker Error:", err);
      }
    }, 60000);

    bot.on('message', async (ctx) => {
      if (ctx.message && 'text' in ctx.message) {
        processOneMessage(ctx.message.text, ctx.chat.id, repoRoot).catch(console.error);
      }
    });

    try {
      logInstruction(0, 'INFO', 'Starting bot in polling mode...');
      await bot.launch({ handlerTimeout: 86400000 });
    } catch (err: any) {
      if (err.message?.includes('409: Conflict')) {
        logInstruction(0, 'INFO', 'Conflict: Another bot instance is already polling. Skipping...');
        cleanup();
        process.exit(0);
      }
      throw err;
    }
    return;
  }

  // Batch Process Mode
  try {
    // 1. Process one item from queue if exists
    await checkQueue(repoRoot).catch(err => console.error("Queue Worker Error:", err));

    // 2. Process new updates
    const lastProcessedRef = db.collection('config').doc('last_processed');
    const doc = await lastProcessedRef.get();
    let lastUpdateId = doc.exists ? doc.data()?.update_id || 0 : 0;

    const updates = await bot.telegram.getUpdates(0, 100, lastUpdateId + 1, ['message']);
    for (const update of updates) {
      if ('message' in update && update.message && 'text' in (update.message as any)) {
        const message = update.message as any;
        await processOneMessage(message.text, message.chat.id, repoRoot);
        lastUpdateId = update.update_id;
      }
    }
    await lastProcessedRef.set({ update_id: lastUpdateId });
    
    // Final heartbeat update
    await botStatusRef.set({ last_seen: new Date() }, { merge: true });
  } catch (err: any) {
    if (err.message?.includes('409: Conflict')) {
      logInstruction(0, 'INFO', 'Conflict detected during update fetch. Skipping...');
    } else {
      console.error(err);
    }
  } finally {
    cleanup();
    process.exit(0);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
