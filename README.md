# 🤖 ClosedAI

[![GitHub License](https://img.shields.io/github/license/woodRock/closedai)](https://github.com/woodRock/closedai/blob/main/LICENSE)
[![GitHub Star](https://img.shields.io/github/stars/woodRock/closedai)](https://github.com/woodRock/closedai/stargazers)
[![Tests](https://github.com/woodRock/closedai/actions/workflows/test.yml/badge.svg)](https://github.com/woodRock/closedai/actions/workflows/test.yml)
[![Status](https://img.shields.io/badge/Status-Stable-brightgreen)](https://github.com/woodRock/closedai)

**ClosedAI** is a secure, serverless, and repository-capable automation agent. It allows you to build, refactor, and manage your GitHub repository directly from your phone via Telegram.

---

## 🌟 Key Features

- **Free Forever**: Powered by GitHub Actions' free tier and Telegram's free Bot API.
- **Full Repository Access**: Gemini can read files, write code, and run shell commands (like `npm install` or `pytest`).
- **Real-time Streaming**: Responses are streamed to Telegram chunk-by-chunk for a smooth user experience.
- **Secure Sandboxing**: Built-in protections prevent accidental deletion of system files or leakage of environment variables.
- **Automated Deployment**: Any changes the bot makes are automatically committed and pushed back to your branch.

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

## ⚡ Instant Mode (Raspberry Pi / Local)

If you want the bot to respond **instantly** instead of waiting for the GitHub Action cron, you can run it on your own hardware:

1.  **Clone the repo** to your local machine.
2.  **Run setup**: `npm run setup` (this creates your `.env`).
3.  **Start with Supervisor (Recommended)**:
    ```bash
    npm run start:service
    ```

---

## 🛡 Security & Sandboxing

ClosedAI is designed to be safe even when self-hosted:

- **Path Restriction**: The bot cannot read or write files outside the repository root.
- **Forbidden Files**: Access to sensitive files like `.env`, `firebase-key.json`, and `.git/` is blocked by default.
- **Shell Filtering**: Dangerous commands (e.g., `rm -rf /`, fork bombs, or environment variable leaks) are automatically blocked.
- **Workspace Isolation**: You can set a `WORKSPACE_DIR` environment variable to restrict the bot's operations to a specific sub-folder.
- **Unsafe Mode**: If you trust the environment, set `UNSAFE_MODE=true` to lift these restrictions.

---

## 🐳 Docker Deployment

1.  **Run setup**: Create your `.env` by running `npm run setup`.
2.  **Start**:
    ```bash
    docker-compose up -d --build
    ```

---
Built with ❤️ using [Gemini CLI](https://github.com/google/gemini-cli).
