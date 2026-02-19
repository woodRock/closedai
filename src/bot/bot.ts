import { Telegraf } from 'telegraf';
import * as https from 'https';
import 'dotenv/config';
import { logInstruction } from '../utils/logger.js';

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!.trim(), {
  handlerTimeout: 86400000,
  telegram: { agent: new https.Agent({ family: 4 }) }
});

bot.catch((err: any) => {
  logInstruction(0, 'ERROR', `Telegraf error: ${err.message}`);
});

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
