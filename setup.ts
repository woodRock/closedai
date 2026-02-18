import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';
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
  console.clear();
  console.log("=========================================");
  console.log("   🤖 CLOSED-AI INSTALLATION WIZARD   ");
  console.log("=========================================\n");

  // Check GH CLI
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    console.log("✅ GitHub CLI is authenticated.");
  } catch (e) {
    console.log("❌ GitHub CLI is not authenticated.");
    console.log("Please run 'gh auth login' first to enable automatic secret setup.\n");
    process.exit(1);
  }

  // 1. Gemini Setup
  const geminiKey = (await question("🔑 Enter your Gemini API Key: ")).trim();
  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    await model.generateContent("ping");
    console.log("✅ Gemini API Key validated.\n");
  } catch (e: any) {
    console.error("❌ Invalid Gemini API Key: " + e.message);
    process.exit(1);
  }

  // 2. Telegram Setup
  const telegramToken = (await question("✉️  Enter your Telegram Bot Token: ")).trim();
  let botUsername = "";
  try {
    const bot = new Telegraf(telegramToken);
    const me = await bot.telegram.getMe();
    botUsername = me.username;
    console.log(`✅ Telegram Bot Token validated (Bot: @${botUsername}).\n`);
  } catch (e: any) {
    console.error("❌ Invalid Telegram Bot Token: " + e.message);
    process.exit(1);
  }

  // 3. Security Check
  const allowedIds = (await question("🛡️  Enter your Telegram User ID(s) for the whitelist (comma-separated, leave blank for public): ")).trim();

  // 4. Firebase Setup
  const firebasePath = (await question("🔥 Enter path to Firebase JSON (e.g., ./firebase-key.json): ")).trim();
  let serviceAccountContent = "";
  try {
    const fullPath = path.resolve(firebasePath);
    serviceAccountContent = fs.readFileSync(fullPath, 'utf-8');
    const serviceAccount = JSON.parse(serviceAccountContent);
    const app = initializeApp({ credential: cert(serviceAccount) }, "setup");
    const db = getFirestore(app);
    await db.collection('config').doc('test').set({ setup_at: new Date() });
    console.log("✅ Firebase Service Account validated.\n");
  } catch (e: any) {
    console.error("❌ Invalid Firebase Service Account: " + e.message);
    process.exit(1);
  }

  // 5. Automated GitHub Secret Setup
  console.log("🚀 Setting up GitHub Secrets...");
  try {
    const secrets = [
      { name: "GEMINI_API_KEY", value: geminiKey },
      { name: "TELEGRAM_BOT_TOKEN", value: telegramToken },
      { name: "FIREBASE_SERVICE_ACCOUNT", value: serviceAccountContent },
      { name: "ALLOWED_TELEGRAM_USER_IDS", value: allowedIds }
    ];

    for (const secret of secrets) {
      if (secret.value) {
        process.stdout.write(`   Installing ${secret.name}... `);
        execSync(`gh secret set ${secret.name}`, { input: secret.value });
        console.log("Done.");
      }
    }
    console.log("\n✅ GitHub Secrets configured successfully.\n");
  } catch (e: any) {
    console.error("❌ Error setting GitHub Secrets: " + e.message);
    console.log("Make sure you are in the correct repository directory.");
  }

  // 6. Generate .env
  const envContent = `TELEGRAM_BOT_TOKEN="${telegramToken}"
GEMINI_API_KEY="${geminiKey}"
FIREBASE_SERVICE_ACCOUNT='${serviceAccountContent.replace(/\n/g, '')}'
ALLOWED_TELEGRAM_USER_IDS="${allowedIds}"
`;
  fs.writeFileSync('.env', envContent);
  console.log("📝 Created .env for local testing.\n");

  console.log("=========================================");
  console.log("        🎉 SETUP COMPLETE!               ");
  console.log("=========================================");
  console.log(`Your bot @${botUsername} is ready to go.`);
  console.log("Run 'npm start' to test locally, or 'git push' to deploy to GitHub Actions.\n");

  rl.close();
}

main().catch(console.error);
