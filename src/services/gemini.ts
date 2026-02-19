import { GoogleGenerativeAI } from '@google/generative-ai';
import { toolDefinitions } from '../tools/index.js';
import 'dotenv/config';

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!.trim());
export const model = genAI.getGenerativeModel(
  { model: "gemini-3-flash-preview", tools: toolDefinitions },
  { timeout: 600000 }
);
