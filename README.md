# 🤖 ClosedAI

[![GitHub License](https://img.shields.io/github/license/woodRock/closedai)](https://github.com/woodRock/closedai/blob/main/LICENSE)
[![GitHub Star](https://img.shields.io/github/stars/woodRock/closedai)](https://github.com/woodRock/closedai/stargazers)
[![Tests](https://github.com/woodRock/closedai/actions/workflows/test.yml/badge.svg)](https://github.com/woodRock/closedai/actions/workflows/test.yml)
[![Status](https://img.shields.io/badge/Status-Stable-brightgreen)](https://github.com/woodRock/closedai)

**ClosedAI** is a secure, serverless, and repository-capable automation agent. It allows you to build, refactor, and manage your GitHub repository directly from your phone via Telegram.

---

## ⚡ Quick Start: Use as a GitHub Action

You can add ClosedAI to **any** existing repository by adding a simple workflow file.

### 1. Create a Workflow File
In your repository, create `.github/workflows/closedai.yml`:

```yaml
name: ClosedAI Agent
on:
  schedule:
    - cron: '*/5 * * * *' # Check for messages every 5 minutes
  workflow_dispatch:      # Allow manual trigger

jobs:
  run-bot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Run ClosedAI
        uses: woodRock/closedai@main
        with:
          telegram_bot_token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
          firebase_service_account: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          allowed_user_ids: ${{ secrets.ALLOWED_TELEGRAM_USER_IDS }}
```

### 2. Configure Secrets
Go to **Settings > Secrets and variables > Actions** and add:
- `TELEGRAM_BOT_TOKEN`: From [@BotFather](https://t.me/botfather).
- `GEMINI_API_KEY`: From [Google AI Studio](https://aistudio.google.com/).
- `FIREBASE_SERVICE_ACCOUNT`: The JSON key from your Firebase project.
- `ALLOWED_TELEGRAM_USER_IDS`: Your Telegram ID (get it from [@userinfobot](https://t.me/userinfobot)).

---

## 🌟 Key Features

- **Free Forever**: Powered by GitHub Actions' free tier and Telegram's free Bot API.
- **Full Repository Access**: Gemini can read files, write code, and run shell commands (like `npm install` or `vitest`).
- **Real-time Streaming**: Responses are streamed to Telegram chunk-by-chunk for a smooth user experience.
- **Secure Sandboxing**: Built-in protections prevent accidental deletion of system files or leakage of environment variables.
- **Automated Deployment**: Any changes the bot makes are automatically committed and pushed back to your branch.

---

## 🚀 Manual Installation (Self-Hosted)

If you want to host the bot yourself for instant responses:

### 1. The Telegram Bot
1.  Message [@BotFather](https://t.me/botfather) on Telegram.
2.  Run `/newbot` and follow the prompts to get your **Bot Token**.

### 2. The Firebase Database
1.  Create a new project in the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Firestore Database** and click **Create Database** (Start in production mode).
3.  Go to **Project Settings** > **Service accounts**.
4.  Click **Generate new private key** and download the JSON file.

### 3. Setup Locally
1.  **Clone the repo**:
    ```bash
    git clone https://github.com/woodrock/closedai.git
    cd closedai && npm install
    ```
2.  **Run setup**: `npm run setup` (this creates your `.env`).
3.  **Start with Supervisor**:
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

---

## 🐳 Docker Deployment

1.  **Run setup**: Create your `.env` by running `npm run setup`.
2.  **Start**:
    ```bash
    docker-compose up -d --build
    ```

---
Built with ❤️ by [woodrock](https://github.com/woodrock).
