# ClosedAI (clowdbot alternative)

A secure, free, and repository-capable SMS/Telegram wrapper for Gemini CLI. 
Runs as a GitHub Action, so you don't need a dedicated server.

## Features
- **Free Forever:** Powered by GitHub Actions (cron jobs) and Telegram's free Bot API.
- **Repository-Capable:** Tell the bot to "add a README" or "fix this bug" and it will commit the changes directly to your repo.
- **Stateless/Secure:** Uses Firebase Firestore to keep track of messages without needing a persistent server.

## Setup Instructions

### 1. Telegram Bot (The Interface)
1. Message [@BotFather](https://t.me/botfather) on Telegram.
2. Type `/newbot`, choose a name (`closedai_bot`).
3. Copy the **API Token**.

### 2. Firebase (The Memory)
1. Create a project on the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database**.
3. Go to **Project Settings > Service accounts > Generate new private key**.
4. Save the JSON file.

### 3. GitHub Secrets
In your repository settings, go to **Secrets and variables > Actions** and add:
- `TELEGRAM_BOT_TOKEN`: The token from BotFather.
- `GEMINI_API_KEY`: Your [Google AI Studio API Key](https://aistudio.google.com/).
- `FIREBASE_SERVICE_ACCOUNT`: The entire content of the Firebase service account JSON.

### 4. Deploy
1. Push this code to your GitHub repository.
2. The GitHub Action will run every 5 minutes automatically.
3. You can also trigger it manually under the "Actions" tab.

## Usage
Simply message your bot on Telegram:
- "Create a new file called app.py with a flask server."
- "Refactor the existing code to use async/await."
- "What files are in the current directory?"

## Why Telegram instead of WhatsApp?
WhatsApp Business API is often paid or requires complex verification. Telegram is 100% free for bots and can be set up in seconds.

---
Built with [Gemini CLI](https://github.com/google/gemini-cli).
