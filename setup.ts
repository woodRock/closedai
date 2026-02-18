import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Telegraf } from 'telegraf';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("
🚀 Welcome to the ClosedAI Setup Wizard!
");

  // 1. Gemini Setup
  const geminiKey = await question("Enter your Gemini API Key: ");
  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    await model.generateContent("ping");
    console.log("✅ Gemini API Key is valid.");
  } catch (e: any) {
    console.error("❌ Invalid Gemini API Key: " + e.message);
    process.exit(1);
  }

  // 2. Telegram Setup
  const telegramToken = await question("
Enter your Telegram Bot Token: ");
  try {
    const bot = new Telegraf(telegramToken);
    const me = await bot.telegram.getMe();
    console.log(`✅ Telegram Bot Token is valid (Bot: @${me.username}).`);
  } catch (e: any) {
    console.error("❌ Invalid Telegram Bot Token: " + e.message);
    process.exit(1);
  }

  // 3. Firebase Setup
  const firebasePath = await question("
Enter the path to your Firebase Service Account JSON (e.g., ./firebase-key.json): ");
  let serviceAccount: any;
  try {
    const fullPath = path.resolve(firebasePath);
    serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    const app = initializeApp({ credential: cert(serviceAccount) }, "setup");
    const db = getFirestore(app);
    await db.collection('config').doc('test').set({ setup: true });
    console.log("✅ Firebase Service Account is valid.");
  } catch (e: any) {
    console.error("❌ Invalid Firebase Service Account: " + e.message);
    process.exit(1);
  }

  // 4. Generate .env and Instructions
  const envContent = `TELEGRAM_BOT_TOKEN="${telegramToken}"
GEMINI_API_KEY="${geminiKey}"
FIREBASE_SERVICE_ACCOUNT='${JSON.stringify(serviceAccount)}'
`;

  fs.writeFileSync('.env', envContent);
  console.log("
✅ Created .env for local testing.");

  console.log("
--- GITHUB SECRETS SETUP ---");
  console.log("Go to your repo settings -> Secrets and variables -> Actions");
  console.log("And add these secrets:
");
  console.log(`TELEGRAM_BOT_TOKEN: ${telegramToken}`);
  console.log(`GEMINI_API_KEY: ${geminiKey}`);
  console.log(`FIREBASE_SERVICE_ACCOUNT: (The entire content of ${firebasePath})`);
  
  console.log("
🎉 Setup complete! You can now run the bot locally with 'npm start' or push to GitHub.");
  rl.close();
}

main().catch(console.error);
