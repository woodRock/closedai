import { SchemaType } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { logInstruction } from '../utils/logger.js';
import pc from 'picocolors';

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

const FORBIDDEN_FILES = [
  '.env',
  'firebase-key.json',
  '.git',
  'node_modules',
  'package-lock.json',
  'service-account.json'
];

function sanitizePath(repoRoot: string, relativePath: string): string {
  const fullPath = path.resolve(repoRoot, relativePath);
  const resolvedRepoRoot = path.resolve(repoRoot);
  
  if (!fullPath.startsWith(resolvedRepoRoot)) {
    throw new Error(`Access denied: Path ${relativePath} is outside of the repository root.`);
  }

  const basename = path.basename(fullPath);
  if (FORBIDDEN_FILES.includes(basename) || relativePath.includes('.git/') || relativePath.includes('node_modules/')) {
    if (process.env.UNSAFE_MODE !== 'true') {
      throw new Error(`Access denied: ${relativePath} is a protected system file.`);
    }
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
    /chmod\s+-R\s+777\s+\//,
    /kill\s+-9\s+-1/,
    /find\s+\/\s+-delete/,
    /export\s+.*?(API_KEY|TOKEN|SECRET|PASSWORD)/i,
    /env\b/,
    /printenv\b/,
    /cat\s+\.env/
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) return false;
  }
  return true;
}

function formatCodeForTerminal(content: string, filePath: string): string {
  const lines = content.split('\n');
  const ext = path.extname(filePath);
  
  return lines.map((line, i) => {
    const lineNum = pc.gray((i + 1).toString().padStart(3) + ' | ');
    let coloredLine = line;
    
    // Very basic regex-based syntax highlighting for the terminal
    if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext)) {
      coloredLine = line
        .replace(/\b(import|export|from|const|let|var|function|return|if|else|for|while|await|async|type|interface|class|extends|default)\b/g, pc.magenta('$1'))
        .replace(/(['"`].*?['"`])/g, pc.green('$1'))
        .replace(/\b(true|false|null|undefined)\b/g, pc.yellow('$1'))
        .replace(/\b(\d+)\b/g, pc.cyan('$1'));
    } else if (['.yml', '.yaml'].includes(ext)) {
      coloredLine = line
        .replace(/^(\s*)([\w-]+):/g, `$1${pc.blue('$2')}:`)
        .replace(/(['"`].*?['"`])/g, pc.green('$1'));
    }
    
    return lineNum + coloredLine;
  }).join('\n');
}

export async function executeTool(name: string, args: any, repoRoot: string, chatId: number, safeSendMessage: (chatId: number, text: string) => Promise<any>) {
  let content;
  const normalizedName = name.replace(/^default_api:/, '');
  const activeRoot = process.env.WORKSPACE_DIR ? path.resolve(process.env.WORKSPACE_DIR) : repoRoot;
  
  try {
    if (normalizedName === "write_file") {
      const p = args.path;
      const fullPath = sanitizePath(activeRoot, p);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, args.content);
      content = { result: `Success: Wrote to ${p}` };
      
      logInstruction(chatId, 'WRITE', p);
      console.log(pc.gray('--- File Content ---'));
      console.log(formatCodeForTerminal(args.content, p));
      console.log(pc.gray('--------------------'));

    } else if (normalizedName === "read_file") {
      const p = args.path;
      const fullPath = sanitizePath(activeRoot, p);
      const fileContent = fs.readFileSync(fullPath, "utf-8");
      content = { result: fileContent };
      logInstruction(chatId, 'READ', p);
    } else if (normalizedName === "list_directory") {
      const p = args.path || '.';
      const fullPath = sanitizePath(activeRoot, p);
      const files = fs.readdirSync(fullPath);
      content = { result: files.join('\n') };
      logInstruction(chatId, 'LIST', p);
    } else if (normalizedName === "delete_file") {
      const p = args.path;
      const fullPath = sanitizePath(activeRoot, p);
      fs.unlinkSync(fullPath);
      content = { result: `Success: Deleted ${p}` };
      logInstruction(chatId, 'DELETE', p);
    } else if (normalizedName === "move_file") {
      const src = sanitizePath(activeRoot, args.source);
      const dst = sanitizePath(activeRoot, args.destination);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.renameSync(src, dst);
      content = { result: `Success: Moved ${args.source} to ${args.destination}` };
      logInstruction(chatId, 'MOVE', `${args.source} -> ${args.destination}`);
    } else if (normalizedName === "search_repo") {
      const query = args.query;
      try {
        const output = execSync(`grep -r "${query.replace(/"/g, '\\"')}" .`, { cwd: activeRoot }).toString();
        content = { result: output };
      } catch (e: any) {
        if (e.status === 1) {
          content = { result: "No results found." };
        } else {
          throw e;
        }
      }
      logInstruction(chatId, 'SEARCH', query);
    } else if (normalizedName === "run_shell") {
      const cmd = args.command;
      if (!isShellCommandSafe(cmd)) {
        throw new Error("Access denied: Dangerous shell command detected.");
      }
      content = { result: execSync(cmd, { cwd: activeRoot }).toString() };
      logInstruction(chatId, 'SHELL', cmd);
    } else if (normalizedName === "reply") {
      const txt = args.text;
      await safeSendMessage(chatId, txt);
      content = { result: "Sent." };
      logInstruction(chatId, 'REPLY', txt.substring(0, 30) + '...');
    } else {
      content = { error: `Unknown tool: ${name}` };
      logInstruction(chatId, 'ERROR', `Model tried to call unknown tool: ${name}`);
    }
  } catch (e: any) {
    content = { error: e.message };
    logInstruction(chatId, 'ERROR', `Tool ${normalizedName} failed: ${e.message}`);
  }
  return content;
}
