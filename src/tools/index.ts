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
        name: "list_directory",
        description: "List the contents of a directory.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Relative path to the directory." }
          },
          required: ["path"]
        }
      },
      {
        name: "delete_file",
        description: "Delete a file.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Relative path to the file." }
          },
          required: ["path"]
        }
      },
      {
        name: "move_file",
        description: "Move or rename a file.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            source: { type: SchemaType.STRING, description: "Source relative path." },
            destination: { type: SchemaType.STRING, description: "Destination relative path." }
          },
          required: ["source", "destination"]
        }
      },
      {
        name: "search_repo",
        description: "Search for a string in the entire repository using grep.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: "The string to search for." }
          },
          required: ["query"]
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

function sanitizePath(repoRoot: string, relativePath: string): string {
  const fullPath = path.resolve(repoRoot, relativePath);
  const resolvedRepoRoot = path.resolve(repoRoot);
  if (!fullPath.startsWith(resolvedRepoRoot)) {
    throw new Error(`Access denied: Path ${relativePath} is outside of the repository root.`);
  }
  return fullPath;
}

function isShellCommandSafe(command: string): boolean {
  if (process.env.UNSAFE_MODE === 'true') return true;
  
  const dangerousPatterns = [
    /rm\s+-rf\s+\//,
    /mkfs/,
    /dd\s+if=/,
    /:(){:|:&};:/, // Fork bomb
    /shutdown/,
    /reboot/,
    /mv\s+.*?\s+\//,
    /chmod\s+-R\s+777\s+\//
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) return false;
  }
  return true;
}

export async function executeTool(name: string, args: any, repoRoot: string, chatId: number, safeSendMessage: (chatId: number, text: string) => Promise<any>) {
  let content;
  try {
    if (name === "write_file") {
      const p = args.path;
      const fullPath = sanitizePath(repoRoot, p);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, args.content);
      content = { result: `Success: Wrote to ${p}` };
      logInstruction(chatId, 'WRITE', p);
    } else if (name === "read_file") {
      const p = args.path;
      const fullPath = sanitizePath(repoRoot, p);
      content = { result: fs.readFileSync(fullPath, "utf-8") };
      logInstruction(chatId, 'READ', p);
    } else if (name === "list_directory") {
      const p = args.path || '.';
      const fullPath = sanitizePath(repoRoot, p);
      const files = fs.readdirSync(fullPath);
      content = { result: files.join('\n') };
      logInstruction(chatId, 'LIST', p);
    } else if (name === "delete_file") {
      const p = args.path;
      const fullPath = sanitizePath(repoRoot, p);
      fs.unlinkSync(fullPath);
      content = { result: `Success: Deleted ${p}` };
      logInstruction(chatId, 'DELETE', p);
    } else if (name === "move_file") {
      const src = sanitizePath(repoRoot, args.source);
      const dst = sanitizePath(repoRoot, args.destination);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.renameSync(src, dst);
      content = { result: `Success: Moved ${args.source} to ${args.destination}` };
      logInstruction(chatId, 'MOVE', `${args.source} -> ${args.destination}`);
    } else if (name === "search_repo") {
      const query = args.query;
      try {
        const output = execSync(`grep -r "${query.replace(/"/g, '\\"')}" .`, { cwd: repoRoot }).toString();
        content = { result: output };
      } catch (e: any) {
        if (e.status === 1) {
          content = { result: "No results found." };
        } else {
          throw e;
        }
      }
      logInstruction(chatId, 'SEARCH', query);
    } else if (name === "run_shell") {
      const cmd = args.command;
      if (!isShellCommandSafe(cmd)) {
        throw new Error("Access denied: Dangerous shell command detected.");
      }
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
