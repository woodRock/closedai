import { Telegraf } from 'telegraf';
import * as https from 'https';
import 'dotenv/config';

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!.trim(), {
  handlerTimeout: 86400000,
  telegram: { agent: new https.Agent({ family: 4 }) }
});
