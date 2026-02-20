# Contributing to ClosedAI

Thank you for your interest in improving ClosedAI! This project aims to provide a seamless, autonomous DevOps experience using AI.

## How to Contribute

### Adding New Tools
The bot's capabilities are defined by "tools" that the AI can call. To add a new tool:

1.  Open `src/tools/index.ts`.
2.  Add the tool's JSON definition to the `toolDefinitions` array. Follow the [Google Generative AI function calling schema](https://ai.google.dev/gemini-api/docs/function-calling).
3.  Implement the tool's logic inside the `executeTool` function.
4.  Ensure you use `sanitizePath` for any file operations to maintain security.
5.  If the tool involves shell commands, verify it against `isShellCommandSafe`.

### Improving the Bot Logic
The core loop is located in `bot.ts`. It handles:
- Telegram message reception.
- Interaction with the Gemini API.
- Multi-turn tool execution.
- Session persistence via Firebase.

### Testing
We use `vitest` for testing. Run tests using:
```bash
npm test
```
Please add tests for any new features or bug fixes in the `tests/` directory.

## Development Setup

1.  Clone the repository.
2.  Install dependencies: `npm install`.
3.  Set up your `.env` file (see `README.md`).
4.  Run in polling mode for fast iteration: `npm run start:poll`.

## Code Style
- Use TypeScript for all new code.
- Follow the existing project structure.
- Keep functions small and focused.

## Security
If you find a security vulnerability, please do not open a public issue. Instead, contact the maintainers privately. We take security seriously, especially given the bot's ability to execute shell commands.
