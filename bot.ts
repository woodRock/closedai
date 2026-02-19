import pc from 'picocolors';
import 'dotenv/config';
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
  logInstruction(0, 'ERROR', `Telegraf error: ${err.message}`);
});

async function run() {
  const isPolling = process.argv.includes('--poll');
  const repoRoot = process.cwd();

  printHeader();

  // Background queue worker
  setInterval(() => {
    checkQueue(repoRoot).catch(err => console.error("Queue Worker Error:", err));
  }, 60000);

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
