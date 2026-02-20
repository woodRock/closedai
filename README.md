# 🤖 ClosedAI

[![GitHub License](https://img.shields.io/github/license/woodRock/closedai)](https://github.com/woodRock/closedai/blob/main/LICENSE)
[![GitHub Star](https://img.shields.io/github/stars/woodRock/closedai)](https://github.com/woodRock/closedai/stargazers)
[![Tests](https://github.com/woodRock/closedai/actions/workflows/test.yml/badge.svg)](https://github.com/woodRock/closedai/actions/workflows/test.yml)
[![Status](https://img.shields.io/badge/Status-Stable-brightgreen)](https://github.com/woodRock/closedai)

**ClosedAI** is a secure, serverless, and repository-capable automation agent. It allows you to build, refactor, and manage your GitHub repository directly from your phone via Telegram.

---

## 🚀 Getting Started

### 1. Create a Firebase Project
ClosedAI uses Firebase Firestore to store message history and state.
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click **Add project** and follow the prompts.
3.  Once created, go to **Build > Firestore Database** and click **Create database**. Follow the prompts to initialize it.
4.  Click the **Gear icon (⚙️)** next to "Project Overview" and select **Project settings**.
5.  Go to the **Service accounts** tab.
6.  Click **Generate new private key**, then click **Generate key**. 
7.  A JSON file will download. **Keep this file safe**; you will need its contents for your GitHub Secrets.

### 2. Enable GitHub Write Permissions
By default, GitHub Actions are restricted to read-only access. To allow the bot to commit code changes:
1.  Go to your repository **Settings**.
2.  Navigate to **Actions > General** in the sidebar.
3.  Scroll down to **Workflow permissions**.
4.  Select **Read and write permissions**.
5.  Click **Save**.

### 3. Configure GitHub Secrets
Go to **Settings > Secrets and variables > Actions** and add the following secrets:
1.  `TELEGRAM_BOT_TOKEN`: Your bot token from [@BotFather](https://t.me/botfather).
2.  `GEMINI_API_KEY`: Your API key from [Google AI Studio](https://aistudio.google.com/).
3.  `FIREBASE_SERVICE_ACCOUNT`: Copy and paste the **entire content** of the JSON file you downloaded in Step 1.
4.  `ALLOWED_TELEGRAM_USER_IDS`: A comma-separated list of your Telegram User IDs (get yours from [@userinfobot](https://t.me/userinfobot)).

### 4. Create the Workflow
Create a file at `.github/workflows/closedai.yml` in your repository:

```yaml
name: ClosedAI Agent
on:
  schedule:
    - cron: '*/5 * * * *' # Check for messages every 5 minutes
  workflow_dispatch:      # Allow manual trigger

permissions:
  contents: write         # Required for the bot to push code changes

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

---

## 🌟 Key Features

- **Free Forever**: Powered by GitHub Actions' free tier and Telegram's free Bot API.
- **Full Repository Access**: Gemini can read files, write code, and run shell commands (like `npm install` or `vitest`).
- **Real-time Streaming**: Responses are streamed to Telegram chunk-by-chunk for a smooth user experience.
- **Secure Sandboxing**: Built-in protections prevent accidental deletion of system files or leakage of environment variables.
- **Automated Deployment**: Any changes the bot makes are automatically committed and pushed back to your branch.

---

## ⚡ Manual Installation (Self-Hosted)

If you want the bot to respond **instantly** instead of waiting for the GitHub Action cron, you can run it on your own hardware:

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

ClosedAI is designed to be safe:

- **Path Restriction**: The bot cannot read or write files outside the repository root.
- **Forbidden Files**: Access to sensitive files like `.env`, `firebase-key.json`, and `.git/` is blocked.
- **Shell Filtering**: Dangerous commands (e.g., `rm -rf /`) are automatically blocked.

---
Built with ❤️ by [woodrock](https://github.com/woodrock).
