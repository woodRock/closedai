import { Telegraf } from 'telegraf'
import * as https from 'https'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Look for .env in the project root (two levels up from src/bot/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing or empty in environment variables.');
  process.exit(1);
}

export const bot = new Telegraf(token, {
  handlerTimeout: 86400000,
  telegram: { agent: new https.Agent({ family: 4 }) },
})
