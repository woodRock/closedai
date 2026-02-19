# 🤖 ClosedAI

[![GitHub License](https://img.shields.io/github/license/woodRock/closedai)](https://github.com/woodRock/closedai/blob/main/LICENSE)
[![GitHub Star](https://img.shields.io/github/stars/woodRock/closedai)](https://github.com/woodRock/closedai/stargazers)
[![Tests](https://github.com/woodRock/closedai/actions/workflows/test.yml/badge.svg)](https://github.com/woodRock/closedai/actions/workflows/test.yml)
[![Status](https://img.shields.io/badge/Status-Stable-brightgreen)](https://github.com/woodRock/closedai)

**ClosedAI** is a secure, serverless, and repository-capable automation agent. It allows you to build, refactor, and manage your GitHub repository directly from your phone via Telegram.

No more expensive servers or complex hosting—ClosedAI runs entirely on **GitHub Actions** and uses **Firebase** for persistence.

---

## 🌟 Key Features

- **Free Forever**: Powered by GitHub Actions' free tier and Telegram's free Bot API.
- **Full Repository Access**: Gemini can read files, write code, and run shell commands (like `npm install` or `pytest`).
- **Secure**: Uses a whitelist system so only you (or your team) can control the bot.
- **Stateless/Sync**: Synchronizes state via Firebase Firestore, ensuring no commands are missed or duplicated.
- **Automated Deployment**: Any changes the bot makes are automatically committed and pushed back to your branch.

---

## 🛠 Prerequisites

1.  **A GitHub Repository**: Where the bot will run.
2.  **Telegram Account**: To interact with the bot.
3.  **Google AI Studio Key**: To access Gemini 1.5 Pro. [Get it here](https://aistudio.google.com/).
4.  **Firebase Project**: For message history and state. [Get it here](https://console.firebase.google.com/).

---

## 🚀 Installation & Setup

### 1. The Telegram Bot
1.  Message [@BotFather](https://t.me/botfather) on Telegram.
2.  Run `/newbot` and follow the prompts to get your **Bot Token**.
3.  (Optional) Use [@userinfobot](https://t.me/userinfobot) to get your **User ID** for the security whitelist.

### 2. The Firebase Database
1.  Create a new project in the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Firestore Database** and click **Create Database** (Start in production mode).
3.  Go to **Project Settings** > **Service accounts**.
4.  Click **Generate new private key** and download the JSON file.

### 3. GitHub Configuration
In your repository, go to **Settings > Secrets and variables > Actions** and add the following **Repository Secrets**:

| Secret Name | Description |
| :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | The token from BotFather. |
| `GEMINI_API_KEY` | Your Google AI Studio API Key. |
| `FIREBASE_SERVICE_ACCOUNT` | The **entire content** of the Firebase Service Account JSON. |
| `ALLOWED_TELEGRAM_USER_IDS` | (Recommended) A comma-separated list of Telegram User IDs allowed to use the bot. |

### 4. Deploy
Push this code to your repository:
```bash
git add .
git commit -m "Initial ClosedAI setup"
git push
```

---

## 💬 Usage

Once deployed, simply message your bot on Telegram:

- **Build features**: *"Add a Python Flask server with a /health endpoint."*
- **Refactor code**: *"Read bot.ts and suggest improvements for error handling."*
- **Run commands**: *"Run 'npm test' and tell me the results."*
- **Manage files**: *"Delete the old temp folder and update the .gitignore."*

The bot polls for new messages every 5 minutes and performs the tasks automatically!

---

## ⚡ Instant Mode (Raspberry Pi / Local)

If you want the bot to respond **instantly** (within seconds) instead of waiting for the GitHub Action cron, you can run it on your own hardware:

1.  **Clone the repo** to your Raspberry Pi or local machine.
2.  **Run setup**: `npm run setup` (this creates your `.env`).
3.  **Start Polling**:
    ```bash
    npm run start:poll
    ```
The bot will now listen for messages in real-time. You can leave it running in a `screen` or `tmux` session on your Pi.

---

## 🐳 Docker Deployment (Recommended)

Running with Docker ensures that your bot stays alive and handles its own environment.

1.  **Run setup**: Create your `.env` by running `npm run setup` locally, or rename `.env.example` to `.env` and fill in the values.
2.  **Start with Docker Compose**:
    ```bash
    docker-compose up -d --build
    ```
This will start the bot in polling mode. It mounts your project directory as a volume, so the bot can still modify and commit your code!

---

## 🛡 Security Note

ClosedAI has full shell access to your repository environment. Always use the `ALLOWED_TELEGRAM_USER_IDS` secret to ensure only authorized users can issue commands.

---
Built with ❤️ using [Gemini CLI](https://github.com/google/gemini-cli).
