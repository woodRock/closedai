import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Telegraf } from 'telegraf';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import pc from 'picocolors';
import * as cliProgress from 'cli-progress';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(pc.cyan(query), resolve));

async function main() {
  console.clear();
  console.log(pc.bold(pc.blue("====================================================")));
  console.log(pc.bold(pc.blue("       🚀 CLOSED-AI INSTALLATION WIZARD            ")));
  console.log(pc.bold(pc.blue("====================================================\n")));

  // Check GH CLI
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    console.log(pc.green("✅ GitHub CLI: authenticated."));
  } catch (e) {
    console.log(pc.red("❌ GitHub CLI: not authenticated."));
    console.log(pc.yellow("Please run 'gh auth login' first to enable automatic secret setup.\n"));
    process.exit(1);
  }

  // 1. Gemini Setup
  const geminiKey = (await question("🔑 Gemini API Key: ")).trim();
  const progressBar = new cliProgress.SingleBar({
    format: pc.cyan('Validating Gemini API Key |') + pc.blue('{bar}') + '| {percentage}%',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
  progressBar.start(100, 0);

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    progressBar.update(50);
    await model.generateContent("ping");
    progressBar.update(100);
    progressBar.stop();
    console.log(pc.green("✅ Gemini API Key: validated.\n"));
  } catch (e: any) {
    progressBar.stop();
    console.error(pc.red("❌ Gemini API Key: invalid: " + e.message));
    console.log(pc.yellow("Hint: Make sure your API key has access to Gemini 3 Flash in AI Studio."));
    process.exit(1);
  }

  // 2. Telegram Setup
  const telegramToken = (await question("✉️  Telegram Bot Token: ")).trim();
  let botUsername = "";
  const telegramProgress = new cliProgress.SingleBar({
    format: pc.cyan('Validating Telegram Bot |') + pc.blue('{bar}') + '| {percentage}%',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
  telegramProgress.start(100, 0);

  try {
    const bot = new Telegraf(telegramToken);
    telegramProgress.update(50);
    const me = await bot.telegram.getMe();
    botUsername = me.username;
    telegramProgress.update(100);
    telegramProgress.stop();
    console.log(pc.green(`✅ Telegram Bot Token: validated (Bot: @${botUsername}).\n`));
  } catch (e: any) {
    telegramProgress.stop();
    console.error(pc.red("❌ Telegram Validation Failed: " + e.message));
    const skip = await question("❓ Validation failed. Do you want to skip validation and use this token anyway? (y/n): ");
    if (skip.toLowerCase() !== 'y') {
      process.exit(1);
    }
  }

  // 3. Security Check
  const allowedIds = (await question("🛡️  Telegram User ID(s) (comma-separated, leave blank for public): ")).trim();

  // 4. Firebase Setup
  const firebasePath = (await question("🔥 Path to Firebase JSON (e.g., ./firebase-key.json): ")).trim();
  let serviceAccountContent = "";
  const firebaseProgress = new cliProgress.SingleBar({
    format: pc.cyan('Validating Firebase |') + pc.blue('{bar}') + '| {percentage}%',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
  firebaseProgress.start(100, 0);

  try {
    const fullPath = path.resolve(firebasePath);
    serviceAccountContent = fs.readFileSync(fullPath, 'utf-8');
    const serviceAccount = JSON.parse(serviceAccountContent);
    firebaseProgress.update(30);
    const app = initializeApp({ credential: cert(serviceAccount) }, "setup");
    const db = getFirestore(app);
    firebaseProgress.update(70);
    await db.collection('config').doc('test').set({ setup_at: new Date() });
    firebaseProgress.update(100);
    firebaseProgress.stop();
    console.log(pc.green("✅ Firebase: validated.\n"));
  } catch (e: any) {
    firebaseProgress.stop();
    console.error(pc.red("❌ Firebase Service Account: invalid: " + e.message));
    process.exit(1);
  }

  // 5. Automated GitHub Secret Setup
  console.log(pc.bold("🚀 Setting up GitHub Secrets..."));
  const secretProgress = new cliProgress.SingleBar({
    format: pc.cyan('Configuring GitHub |') + pc.blue('{bar}') + '| {percentage}% | {task}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  try {
    const secrets = [
      { name: "GEMINI_API_KEY", value: geminiKey },
      { name: "TELEGRAM_BOT_TOKEN", value: telegramToken },
      { name: "FIREBASE_SERVICE_ACCOUNT", value: serviceAccountContent },
      { name: "ALLOWED_TELEGRAM_USER_IDS", value: allowedIds }
    ];

    secretProgress.start(secrets.length, 0, { task: 'Initializing' });
    for (let i = 0; i < secrets.length; i++) {
      const secret = secrets[i];
      if (secret.value) {
        secretProgress.update(i, { task: secret.name });
        execSync(`gh secret set ${secret.name}`, { input: secret.value });
      }
    }
    secretProgress.update(secrets.length, { task: 'Complete' });
    secretProgress.stop();
    console.log(pc.green("\n✅ GitHub Secrets: configured successfully.\n"));
  } catch (e: any) {
    secretProgress.stop();
    console.error(pc.red("❌ Error setting GitHub Secrets: " + e.message));
  }

  // 6. Generate .env
  const envContent = `TELEGRAM_BOT_TOKEN="${telegramToken}"
GEMINI_API_KEY="${geminiKey}"
FIREBASE_SERVICE_ACCOUNT='${serviceAccountContent.replace(/\n/g, '')}'
ALLOWED_TELEGRAM_USER_IDS="${allowedIds}"
`;
  fs.writeFileSync('.env', envContent);
  console.log(pc.green("📝 Created .env for local testing.\n"));

  console.log(pc.bold(pc.blue("====================================================")));
  console.log(pc.bold(pc.green("           🎉 SETUP COMPLETE!               ")));
  console.log(pc.bold(pc.blue("====================================================\n")));
  console.log(pc.cyan(`Your bot @${botUsername} is ready to go.`));
  console.log(`Run ${pc.bold('npm start')} to test locally, or ${pc.bold('git push')} to deploy.\n`);

  rl.close();
}

main().catch(console.error);
