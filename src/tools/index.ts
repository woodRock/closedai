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
        name: "patch_file",
        description: "Apply search-and-replace patches to a file. This is more efficient than write_file for large files. Each patch must match exactly one block of text.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Relative path to the file." },
            patches: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  search: { type: SchemaType.STRING, description: "The exact block of text to find." },
                  replace: { type: SchemaType.STRING, description: "The block of text to replace it with." }
                },
                required: ["search", "replace"]
              }
            }
          },
          required: ["path", "patches"]
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
            query: { type: SchemaType.STRING, description: "The string to search for." },
            case_insensitive: { type: SchemaType.BOOLEAN, description: "Whether to ignore case." }
          },
          required: ["query"]
        }
      },
      {
        name: "list_files",
        description: "List all files in the repository recursively.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Relative path to start from (default: .)." }
          }
        }
      },
      {
        name: "git_diff_summary",
        description: "Show a summarized view of changes (diff --stat).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}
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
        name: "git_status",
        description: "Show the working tree status.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: "git_log",
        description: "Show commit logs.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            limit: { type: SchemaType.NUMBER, description: "Number of commits to show." }
          }
        }
      },
      {
        name: "git_diff",
        description: "Show changes between commits, commit and working tree, etc.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            cached: { type: SchemaType.BOOLEAN, description: "Show only staged changes." }
          }
        }
      },
      {
        name: "git_add",
        description: "Add file contents to the index.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Path to add. Use '.' for all." }
          },
          required: ["path"]
        }
      },
      {
        name: "git_commit",
        description: "Record changes to the repository.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            message: { type: SchemaType.STRING, description: "Commit message." }
          },
          required: ["message"]
        }
      },
      {
        name: "git_push",
        description: "Update remote refs.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            remote: { type: SchemaType.STRING, description: "Remote name (default: origin)." },
            branch: { type: SchemaType.STRING, description: "Branch name (default: current)." }
          }
        }
      },
      {
        name: "git_checkout",
        description: "Switch branches or restore working tree files.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            branch: { type: SchemaType.STRING, description: "Branch name to checkout." },
            create: { type: SchemaType.BOOLEAN, description: "Create branch if it doesn't exist (-b)." }
          },
          required: ["branch"]
        }
      },
      {
        name: "git_branch",
        description: "List, create, or delete branches.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            list: { type: SchemaType.BOOLEAN, description: "List branches." },
            delete: { type: SchemaType.STRING, description: "Delete branch name." }
          }
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

function generateDiff(path: string, search: string, replace: string, useColor = false): string {
  const red = useColor ? (s: string) => pc.red(s) : (s: string) => s;
  const green = useColor ? (s: string) => pc.green(s) : (s: string) => s;
  const bold = useColor ? (s: string) => pc.bold(s) : (s: string) => s;

  let diff = `${bold('--- ' + path)}\n${bold('+++ ' + path)}\n`;
  
  const searchLines = search.split('\n');
  const replaceLines = replace.split('\n');

  for (const line of searchLines) {
    diff += red('- ' + line) + '\n';
  }
  for (const line of replaceLines) {
    diff += green('+ ' + line) + '\n';
  }
  
  return diff;
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

    } else if (normalizedName === "patch_file") {
      const p = args.path;
      const fullPath = sanitizePath(activeRoot, p);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${p}`);
      }

      let fileContent = fs.readFileSync(fullPath, "utf-8");
      let diffOutput = "";
      let terminalDiff = "";

      for (const patch of args.patches) {
        const { search, replace } = patch;
        if (!fileContent.includes(search)) {
          throw new Error(`Patch failed: Could not find exact match for search block in ${p}`);
        }
        
        // Check if there's more than one occurrence to avoid ambiguity
        const occurrences = fileContent.split(search).length - 1;
        if (occurrences > 1) {
          throw new Error(`Patch failed: Search block is ambiguous, found ${occurrences} occurrences in ${p}`);
        }

        fileContent = fileContent.replace(search, replace);
        diffOutput += generateDiff(p, search, replace, false);
        terminalDiff += generateDiff(p, search, replace, true);
      }

      fs.writeFileSync(fullPath, fileContent);
      content = { result: `Success: Patched ${p}\n\n${diffOutput}` };
      
      logInstruction(chatId, 'PATCH', p);
      console.log(pc.gray('--- Patch Diff ---'));
      console.log(terminalDiff.trim());
      console.log(pc.gray('------------------'));

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
      const caseFlag = args.case_insensitive ? "-i" : "";
      try {
        const output = execSync(`grep -r ${caseFlag} --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist "${query.replace(/"/g, '\\"')}" .`, { cwd: activeRoot }).toString();
        content = { result: output };
      } catch (e: any) {
        if (e.status === 1) {
          content = { result: "No results found." };
        } else {
          throw e;
        }
      }
      logInstruction(chatId, 'SEARCH', query);
    } else if (normalizedName === "list_files") {
      const p = args.path || '.';
      const fullPath = sanitizePath(activeRoot, p);
      const output = execSync(`find ${p} -maxdepth 4 -not -path "*/.*" -not -path "*/node_modules/*" -not -path "*/dist/*"`, { cwd: activeRoot }).toString();
      content = { result: output };
      logInstruction(chatId, 'LIST_FILES', p);
    } else if (normalizedName === "git_diff_summary") {
      const output = execSync("git diff --stat", { cwd: activeRoot }).toString();
      content = { result: output || "No changes." };
      logInstruction(chatId, 'GIT', 'diff --stat');
    } else if (normalizedName === "run_shell") {
      const cmd = args.command;
      if (!isShellCommandSafe(cmd)) {
        throw new Error("Access denied: Dangerous shell command detected.");
      }
      content = { result: execSync(cmd, { cwd: activeRoot }).toString() };
      logInstruction(chatId, 'SHELL', cmd);
    } else if (normalizedName === "git_status") {
      content = { result: execSync("git status", { cwd: activeRoot }).toString() };
      logInstruction(chatId, 'GIT', 'status');
    } else if (normalizedName === "git_log") {
      const limit = args.limit || 10;
      content = { result: execSync(`git log -n ${limit} --oneline`, { cwd: activeRoot }).toString() };
      logInstruction(chatId, 'GIT', `log -n ${limit}`);
    } else if (normalizedName === "git_diff") {
      const cmd = args.cached ? "git diff --cached" : "git diff";
      content = { result: execSync(cmd, { cwd: activeRoot }).toString() };
      logInstruction(chatId, 'GIT', args.cached ? 'diff --cached' : 'diff');
    } else if (normalizedName === "git_add") {
      execSync(`git add ${args.path}`, { cwd: activeRoot });
      content = { result: `Success: Added ${args.path}` };
      logInstruction(chatId, 'GIT', `add ${args.path}`);
    } else if (normalizedName === "git_commit") {
      execSync(`git commit -m "${args.message.replace(/"/g, '\\"')}"`, { cwd: activeRoot });
      content = { result: `Success: Committed with message: ${args.message}` };
      logInstruction(chatId, 'GIT', `commit -m "${args.message}"`);
    } else if (normalizedName === "git_push") {
      const remote = args.remote || "origin";
      const branch = args.branch || "HEAD";
      execSync(`git push ${remote} ${branch}`, { cwd: activeRoot });
      content = { result: `Success: Pushed to ${remote} ${branch}` };
      logInstruction(chatId, 'GIT', `push ${remote} ${branch}`);
    } else if (normalizedName === "git_checkout") {
      const flag = args.create ? "-b" : "";
      execSync(`git checkout ${flag} ${args.branch}`, { cwd: activeRoot });
      content = { result: `Success: Checked out ${args.branch}` };
      logInstruction(chatId, 'GIT', `checkout ${flag} ${args.branch}`);
    } else if (normalizedName === "git_branch") {
      if (args.delete) {
        execSync(`git branch -D ${args.delete}`, { cwd: activeRoot });
        content = { result: `Success: Deleted branch ${args.delete}` };
        logInstruction(chatId, 'GIT', `branch -D ${args.delete}`);
      } else {
        content = { result: execSync("git branch", { cwd: activeRoot }).toString() };
        logInstruction(chatId, 'GIT', 'branch');
      }
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
