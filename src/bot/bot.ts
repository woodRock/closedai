/**
 * @fileoverview Main bot instance and messaging utilities.
 */

import { Telegraf } from 'telegraf'
import * as https from 'https'
import 'dotenv/config'
import { logInstruction } from '../utils/logger.js'

/**
 * Telegraf bot instance configured with a long timeout and IPv4 agent.
 */
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!.trim(), {
  handlerTimeout: 86400000,
  telegram: { agent: new https.Agent({ family: 4 }) },
})

bot.catch((err: unknown) => {
  const errorMessage = err instanceof Error ? err.message : String(err)
  logInstruction(0, 'ERROR', `Telegraf error: ${errorMessage}`)
})

const MAX_MESSAGE_LENGTH = 4000

/**
 * Sends a message to a Telegram chat safely, handling long messages and Markdown parsing errors.
 *
 * @param chatId - The unique identifier for the target chat.
 * @param text - The text of the message to be sent.
 * @returns A promise that resolves to the sent message object.
 */
export async function safeSendMessage(chatId: number, text: string) {
  if (!text) return
  try {
    if (text.length <= MAX_MESSAGE_LENGTH) {
      return await bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' })
    }
    const truncated = text.substring(0, MAX_MESSAGE_LENGTH) + '\n\n... (message truncated)'
    return await bot.telegram.sendMessage(chatId, truncated, { parse_mode: 'Markdown' })
  } catch {
    try {
      return await bot.telegram.sendMessage(chatId, text)
    } catch {
      logInstruction(chatId, 'ERROR', 'Failed to send message')
    }
  }
}
