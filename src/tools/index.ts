import { SchemaType } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { logInstruction } from '../utils/logger.js';

export const toolDefinitions = [
  {
    functionDeclarations: [
      {
        name: "write_file",
        description: "Create or overwrite a file with specific content.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Relative path to the file." },
            content: { type: SchemaType.STRING, description: "Full content of the file." }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "read_file",
        description: "Read the content of a file.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Relative path to the file." }
          },
          required: ["path"]
        }
      },
      {
        name: "run_shell",
        description: "Execute a shell command and return the output.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            command: { type: SchemaType.STRING, description: "The shell command to run." }
          },
          required: ["command"]
        }
      },
      {
        name: "reply",
        description: "Send a message back to the user in Telegram. Use this to provide progress updates, ask questions, or give a final summary.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            text: { type: SchemaType.STRING, description: "The message text." }
          },
          required: ["text"]
        }
      }
    ]
  }
];

export async function executeTool(name: string, args: any, repoRoot: string, chatId: number, safeSendMessage: (chatId: number, text: string) => Promise<any>) {
  let content;
  try {
    if (name === "write_file") {
      const p = args.path;
      const fullPath = path.join(repoRoot, p);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, args.content);
      content = { result: `Success: Wrote to ${p}` };
      logInstruction(chatId, 'WRITE', p);
    } else if (name === "read_file") {
      const p = args.path;
      const fullPath = path.join(repoRoot, p);
      content = { result: fs.readFileSync(fullPath, "utf-8") };
      logInstruction(chatId, 'READ', p);
    } else if (name === "run_shell") {
      const cmd = args.command;
      content = { result: execSync(cmd, { cwd: repoRoot }).toString() };
      logInstruction(chatId, 'SHELL', cmd);
    } else if (name === "reply") {
      const txt = args.text;
      await safeSendMessage(chatId, txt);
      content = { result: "Sent." };
      logInstruction(chatId, 'REPLY', txt.substring(0, 30) + '...');
    }
  } catch (e: any) {
    content = { error: e.message };
    logInstruction(chatId, 'ERROR', `Tool ${name} failed: ${e.message}`);
  }
  return content;
}
