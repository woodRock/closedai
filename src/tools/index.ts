/**
 * @fileoverview Definitions and execution logic for tools available to the Gemini model.
 */

import { SchemaType } from '@google/generative-ai'
import type { Tool } from '@google/generative-ai'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import { logInstruction } from '../utils/logger.js'
import pc from 'picocolors'
import { decode } from 'html-entities'

import { getFileOutline } from '../utils/code-intelligence.js'
import { db } from '../services/firebase.js'
import { indexFile, semanticSearch } from '../utils/rag.js'

/**
 * Definitions of available tools for the Gemini model, following the Google Generative AI schema.
 */
export const toolDefinitions: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'get_file_outline',
        description:
          'Get a summary of classes, methods, and functions in a code file using Tree-sitter.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the file.' },
          },
          required: ['path'],
        },
      },
      {
        name: 'find_symbol_definitions',
        description: 'Find definitions of a symbol across the workspace.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: 'The name of the symbol to find.' },
          },
          required: ['name'],
        },
      },
      {
        name: 'find_symbol_references',
        description: 'Find references to a symbol across the workspace.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: {
              type: SchemaType.STRING,
              description: 'The name of the symbol to find references for.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'write_file',
        description: 'Create or overwrite a file with specific content.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the file.' },
            content: { type: SchemaType.STRING, description: 'Full content of the file.' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'patch_file',
        description:
          'Apply search-and-replace patches to a file. This is more efficient than write_file for large files. Each patch must match exactly one block of text.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the file.' },
            patches: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  search: {
                    type: SchemaType.STRING,
                    description: 'The exact block of text to find.',
                  },
                  replace: {
                    type: SchemaType.STRING,
                    description: 'The block of text to replace it with.',
                  },
                },
                required: ['search', 'replace'],
              },
            },
          },
          required: ['path', 'patches'],
        },
      },
      {
        name: 'patch_file_symbol',
        description:
          'Replace a specific symbol (function, class, method) in a file with new content using AST.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the file.' },
            symbol_name: {
              type: SchemaType.STRING,
              description: 'The name of the symbol to replace.',
            },
            new_content: {
              type: SchemaType.STRING,
              description: 'The new content for the symbol.',
            },
          },
          required: ['path', 'symbol_name', 'new_content'],
        },
      },
      {
        name: 'read_file',
        description: 'Read the content of a file.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the file.' },
          },
          required: ['path'],
        },
      },
      {
        name: 'read_file_lines',
        description: 'Read specific line range from a file (1-indexed).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the file.' },
            start_line: {
              type: SchemaType.NUMBER,
              description: 'Starting line number (inclusive, 1-indexed).',
            },
            end_line: {
              type: SchemaType.NUMBER,
              description: 'Ending line number (inclusive, 1-indexed).',
            },
          },
          required: ['path', 'start_line', 'end_line'],
        },
      },
      {
        name: 'list_directory',
        description: 'List the contents of a directory.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the directory.' },
          },
          required: ['path'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the file.' },
          },
          required: ['path'],
        },
      },
      {
        name: 'move_file',
        description: 'Move or rename a file.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            source: { type: SchemaType.STRING, description: 'Source relative path.' },
            destination: { type: SchemaType.STRING, description: 'Destination relative path.' },
          },
          required: ['source', 'destination'],
        },
      },
      {
        name: 'search_repo',
        description: 'Search for a string in the entire repository using grep.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: 'The string to search for.' },
            case_insensitive: { type: SchemaType.BOOLEAN, description: 'Whether to ignore case.' },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_files',
        description: 'List all files in the repository recursively.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: {
              type: SchemaType.STRING,
              description: 'Relative path to start from (default: .).',
            },
          },
        },
      },
      {
        name: 'git_diff_summary',
        description: 'Show a summarized view of changes (diff --stat).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'run_shell',
        description: 'Execute a shell command and return the output.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            command: { type: SchemaType.STRING, description: 'The shell command to run.' },
          },
          required: ['command'],
        },
      },
      {
        name: 'git_status',
        description: 'Show the working tree status.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'git_log',
        description: 'Show commit logs.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            limit: { type: SchemaType.NUMBER, description: 'Number of commits to show.' },
          },
        },
      },
      {
        name: 'git_diff',
        description: 'Show changes between commits, commit and working tree, etc.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            cached: { type: SchemaType.BOOLEAN, description: 'Show only staged changes.' },
          },
        },
      },
      {
        name: 'git_add',
        description: 'Add file contents to the index.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Path to add. Use '.' for all." },
          },
          required: ['path'],
        },
      },
      {
        name: 'git_commit',
        description: 'Record changes to the repository.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            message: { type: SchemaType.STRING, description: 'Commit message.' },
          },
          required: ['message'],
        },
      },
      {
        name: 'git_push',
        description: 'Update remote refs. Optionally runs a pre-flight check (tests).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            remote: { type: SchemaType.STRING, description: 'Remote name (default: origin).' },
            branch: { type: SchemaType.STRING, description: 'Branch name (default: current).' },
            run_tests: {
              type: SchemaType.BOOLEAN,
              description: 'Whether to run npm test before pushing.',
            },
          },
        },
      },
      {
        name: 'pre_flight_check',
        description: 'Run tests and linting to ensure code quality.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'format_file',
        description: 'Format a file using project-specific tools (e.g., Prettier).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the file.' },
          },
          required: ['path'],
        },
      },
      {
        name: 'lint_file',
        description: 'Lint a file and optionally fix issues.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the file.' },
            fix: {
              type: SchemaType.BOOLEAN,
              description: 'Whether to attempt to fix linting issues.',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'run_tests',
        description: 'Run tests, optionally filtered by file or test name pattern.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: 'Relative path to the test file.' },
            pattern: {
              type: SchemaType.STRING,
              description: 'Regex pattern of test names to run.',
            },
          },
        },
      },
      {
        name: 'git_checkout',
        description: 'Switch branches or restore working tree files.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            branch: { type: SchemaType.STRING, description: 'Branch name to checkout.' },
            create: {
              type: SchemaType.BOOLEAN,
              description: "Create branch if it doesn't exist (-b).",
            },
          },
          required: ['branch'],
        },
      },
      {
        name: 'git_branch',
        description: 'List, create, or delete branches.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            list: { type: SchemaType.BOOLEAN, description: 'List branches.' },
            delete: { type: SchemaType.STRING, description: 'Delete branch name.' },
          },
        },
      },
      {
        name: 'web_search',
        description: 'Search the web for up to date information.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: 'The search query.' },
          },
          required: ['query'],
        },
      },
      {
        name: 'http_request',
        description: 'Make a structured HTTP request.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            url: { type: SchemaType.STRING, description: 'The URL to request.' },
            method: {
              type: SchemaType.STRING,
              description: 'The HTTP method (GET, POST, etc.). Default is GET.',
            },
            headers: { type: SchemaType.OBJECT, description: 'Optional request headers.' },
            body: { type: SchemaType.STRING, description: 'Optional request body.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'db_list_collections',
        description: 'List all top-level Firestore collections.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'db_get_collection_schema',
        description: 'Infer the schema of a collection by inspecting sample documents.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            collection: { type: SchemaType.STRING, description: 'The name of the collection.' },
          },
          required: ['collection'],
        },
      },
      {
        name: 'db_query_collection',
        description: 'Query a Firestore collection with basic filters.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            collection: { type: SchemaType.STRING, description: 'The name of the collection.' },
            limit: {
              type: SchemaType.NUMBER,
              description: 'Max number of documents to return (default 10).',
            },
            where: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  field: { type: SchemaType.STRING },
                  op: { type: SchemaType.STRING, description: 'Operation: ==, >, <, etc.' },
                  value: { type: SchemaType.STRING },
                },
              },
              description: 'Optional filters.',
            },
          },
          required: ['collection'],
        },
      },
      {
        name: 'index_repo',
        description: 'Index the repository for semantic search. This might take a while.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            paths: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                'Optional list of paths to index. If empty, indexes common source files.',
            },
          },
        },
      },
      {
        name: 'semantic_search',
        description: 'Search the codebase using natural language.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: 'The search query.' },
            limit: {
              type: SchemaType.NUMBER,
              description: 'Number of results to return (default 5).',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'set_project_rule',
        description: 'Set a project-specific rule or preference (e.g., coding style).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            rule: { type: SchemaType.STRING, description: 'The rule description.' },
            category: {
              type: SchemaType.STRING,
              description: "Optional category (e.g., 'style', 'workflow').",
            },
          },
          required: ['rule'],
        },
      },
      {
        name: 'list_project_rules',
        description: 'List all project-specific rules.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
    ],
  },
]

const FORBIDDEN_FILES = [
  '.env',
  'firebase-key.json',
  '.git',
  'node_modules',
  'package-lock.json',
  'service-account.json',
]

/**
 * Resolves and validates a relative path against the repository root.
 *
 * @param repoRoot - The root directory of the repository.
 * @param relativePath - The relative path to sanitize.
 * @returns The resolved absolute path.
 * @throws {Error} If the path is outside the root or points to a forbidden file.
 */
function sanitizePath(repoRoot: string, relativePath: string): string {
  const fullPath = path.resolve(repoRoot, relativePath)
  const resolvedRepoRoot = path.resolve(repoRoot)

  if (!fullPath.startsWith(resolvedRepoRoot)) {
    throw new Error(`Access denied: Path ${relativePath} is outside of the repository root.`)
  }

  const basename = path.basename(fullPath)
  if (
    FORBIDDEN_FILES.includes(basename) ||
    relativePath.includes('.git/') ||
    relativePath.includes('node_modules/')
  ) {
    if (process.env.UNSAFE_MODE !== 'true') {
      throw new Error(`Access denied: ${relativePath} is a protected system file.`)
    }
  }

  return fullPath
}

/**
 * Checks if a shell command contains potentially dangerous patterns.
 *
 * @param command - The shell command to validate.
 * @returns True if the command is considered safe, false otherwise.
 */
function isShellCommandSafe(command: string): boolean {
  if (process.env.UNSAFE_MODE === 'true') return true

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
    /cat\s+\.env/,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) return false
  }
  return true
}

/**
 * Formats code content with line numbers and basic syntax highlighting for terminal output.
 *
 * @param content - The code content to format.
 * @param filePath - The path of the file (used for extension-based highlighting).
 * @returns The formatted string.
 */
function formatCodeForTerminal(content: string, filePath: string): string {
  const lines = content.split('\n')
  const ext = path.extname(filePath)

  return lines
    .map((line, i) => {
      const lineNum = pc.gray((i + 1).toString().padStart(3) + ' | ')
      let coloredLine = line

      // Very basic regex-based syntax highlighting for the terminal
      if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext)) {
        coloredLine = line
          .replace(
            /\b(import|export|from|const|let|var|function|return|if|else|for|while|await|async|type|interface|class|extends|default)\b/g,
            pc.magenta('$1'),
          )
          .replace(/(['"`].*?['"`])/g, pc.green('$1'))
          .replace(/\b(true|false|null|undefined)\b/g, pc.yellow('$1'))
          .replace(/\b(\d+)\b/g, pc.cyan('$1'))
      } else if (['.yml', '.yaml'].includes(ext)) {
        coloredLine = line
          .replace(/^(\s*)([\w-]+):/g, `$1${pc.blue('$2')}:`)
          .replace(/(['"`].*?['"`])/g, pc.green('$1'))
      }

      return lineNum + coloredLine
    })
    .join('\n')
}

/**
 * Generates a unified diff string representing changes between search and replace blocks.
 *
 * @param path - The file path being patched.
 * @param search - The original text block.
 * @param replace - The new text block.
 * @param useColor - Whether to include ANSI color codes in the output.
 * @returns A formatted diff string.
 */
function generateDiff(path: string, search: string, replace: string, useColor = false): string {
  const red = useColor ? (s: string) => pc.red(s) : (s: string) => s
  const green = useColor ? (s: string) => pc.green(s) : (s: string) => s
  const bold = useColor ? (s: string) => pc.bold(s) : (s: string) => s

  let diff = `${bold('--- ' + path)}\n${bold('+++ ' + path)}\n`

  const searchLines = search.split('\n')
  const replaceLines = replace.split('\n')

  for (const line of searchLines) {
    diff += red('- ' + line) + '\n'
  }
  for (const line of replaceLines) {
    diff += green('+ ' + line) + '\n'
  }

  return diff
}

/**
 * Executes a tool by name with the provided arguments.
 *
 * @param name - The name of the tool to execute.
 * @param args - The arguments for the tool.
 * @param repoRoot - The root directory of the repository.
 * @param chatId - The chat ID for logging purposes.
 * @param safeSendMessage - Utility function to send messages back to the user.
 * @returns A promise that resolves to the result or error of the tool execution.
 */
export async function executeTool(
  name: string,
  args: any,
  repoRoot: string,
  chatId: number,
  safeSendMessage: (chatId: number, text: string) => Promise<any>,
) {
  let content
  const normalizedName = name.replace(/^default_api:/, '')
  const activeRoot = process.env.WORKSPACE_DIR ? path.resolve(process.env.WORKSPACE_DIR) : repoRoot

  try {
    if (normalizedName === 'get_file_outline') {
      const p = args.path
      const fullPath = sanitizePath(activeRoot, p)
      const fileContent = fs.readFileSync(fullPath, 'utf-8')
      const outline = await getFileOutline(p, fileContent)
      content = { result: JSON.stringify(outline, null, 2) }
      logInstruction(chatId, 'OUTLINE', p)
    } else if (normalizedName === 'find_symbol_definitions') {
      const name = args.name
      logInstruction(chatId, 'FIND_DEF', name)
      try {
        // Step 1: Search for the name using grep
        const grepOutput = execSync(
          `grep -r -l --exclude-dir=.git --exclude-dir=node_modules "${name}" .`,
          { cwd: activeRoot },
        ).toString()
        const files = grepOutput.split('\n').filter((f) => f.trim() !== '')
        const results = []

        for (const file of files) {
          try {
            const fullPath = sanitizePath(activeRoot, file)
            const fileContent = fs.readFileSync(fullPath, 'utf-8')
            const outline = await getFileOutline(file, fileContent)

            for (const symbol of outline) {
              if (symbol.name === name) {
                results.push({
                  file,
                  type: symbol.type,
                  start: symbol.start,
                  end: symbol.end,
                })
              }
            }
          } catch (e) {
            // Skip files with unsupported languages or other errors
          }
        }
        content = { result: JSON.stringify(results, null, 2) }
      } catch (e: any) {
        content = { result: '[]' }
      }
    } else if (normalizedName === 'find_symbol_references') {
      const name = args.name
      logInstruction(chatId, 'FIND_REF', name)
      try {
        // Search for the name using grep -n to get line numbers
        const grepOutput = execSync(
          `grep -r -n --exclude-dir=.git --exclude-dir=node_modules "\\b${name}\\b" .`,
          { cwd: activeRoot },
        ).toString()
        const lines = grepOutput.split('\n').filter((l) => l.trim() !== '')
        const results = []

        for (const line of lines) {
          const parts = line.split(':')
          if (parts.length >= 3) {
            const file = parts[0]
            const lineNum = parseInt(parts[1])
            const context = parts.slice(2).join(':').trim()

            // Try to filter out definitions if possible
            let isDefinition = false
            try {
              const fullPath = sanitizePath(activeRoot, file)
              const fileContent = fs.readFileSync(fullPath, 'utf-8')
              const outline = await getFileOutline(file, fileContent)
              isDefinition = outline.some((s) => s.name === name && s.start.row + 1 === lineNum)
            } catch (e) {
              // Ignore errors during outline extraction for filtering
            }

            if (!isDefinition) {
              results.push({ file, line: lineNum, context })
            }
          }
        }
        content = { result: JSON.stringify(results, null, 2) }
      } catch (e: any) {
        content = { result: '[]' }
      }
    } else if (normalizedName === 'write_file') {
      const p = args.path
      const fullPath = sanitizePath(activeRoot, p)
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, args.content)
      content = { result: `Success: Wrote to ${p}` }

      logInstruction(chatId, 'WRITE', p)
      console.log(pc.gray('--- File Content ---'))
      console.log(formatCodeForTerminal(args.content, p))
      console.log(pc.gray('--------------------'))
    } else if (normalizedName === 'patch_file') {
      const p = args.path
      const fullPath = sanitizePath(activeRoot, p)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${p}`)
      }

      let fileContent = fs.readFileSync(fullPath, 'utf-8')
      let diffOutput = ''
      let terminalDiff = ''

      for (const patch of args.patches) {
        const { search, replace } = patch
        if (!fileContent.includes(search)) {
          throw new Error(`Patch failed: Could not find exact match for search block in ${p}`)
        }

        // Check if there's more than one occurrence to avoid ambiguity
        const occurrences = fileContent.split(search).length - 1
        if (occurrences > 1) {
          throw new Error(
            `Patch failed: Search block is ambiguous, found ${occurrences} occurrences in ${p}`,
          )
        }

        fileContent = fileContent.replace(search, replace)
        diffOutput += generateDiff(p, search, replace, false)
        terminalDiff += generateDiff(p, search, replace, true)
      }

      fs.writeFileSync(fullPath, fileContent)
      content = { result: `Success: Patched ${p}\n\n${diffOutput}` }

      logInstruction(chatId, 'PATCH', p)
      console.log(pc.gray('--- Patch Diff ---'))
      console.log(terminalDiff.trim())
      console.log(pc.gray('------------------'))
    } else if (normalizedName === 'patch_file_symbol') {
      const p = args.path
      const symbolName = args.symbol_name
      const newContent = args.new_content
      const fullPath = sanitizePath(activeRoot, p)

      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${p}`)
      }

      const fileContent = fs.readFileSync(fullPath, 'utf-8')
      const outline = await getFileOutline(p, fileContent)

      const symbol = outline.find((s) => s.name === symbolName)
      if (!symbol) {
        throw new Error(`Symbol ${symbolName} not found in ${p}`)
      }

      const oldSymbolContent = fileContent.substring(symbol.startIndex, symbol.endIndex)
      const newFileContent =
        fileContent.substring(0, symbol.startIndex) +
        newContent +
        fileContent.substring(symbol.endIndex)

      fs.writeFileSync(fullPath, newFileContent)

      const diffOutput = generateDiff(p, oldSymbolContent, newContent, false)
      const terminalDiff = generateDiff(p, oldSymbolContent, newContent, true)

      content = { result: `Success: Patched symbol ${symbolName} in ${p}\n\n${diffOutput}` }

      logInstruction(chatId, 'PATCH_SYMBOL', `${p}#${symbolName}`)
      console.log(pc.gray('--- Patch Diff ---'))
      console.log(terminalDiff.trim())
      console.log(pc.gray('------------------'))
    } else if (normalizedName === 'read_file') {
      const p = args.path
      const fullPath = sanitizePath(activeRoot, p)
      const fileContent = fs.readFileSync(fullPath, 'utf-8')
      content = { result: fileContent }
      logInstruction(chatId, 'READ', p)
    } else if (normalizedName === 'read_file_lines') {
      const p = args.path
      const start = args.start_line
      const end = args.end_line
      const fullPath = sanitizePath(activeRoot, p)
      const fileContent = fs.readFileSync(fullPath, 'utf-8')
      const lines = fileContent.split('\n')
      const selectedLines = lines.slice(start - 1, end)
      content = { result: selectedLines.join('\n') }
      logInstruction(chatId, 'READ_LINES', `${p} (${start}-${end})`)
    } else if (normalizedName === 'list_directory') {
      const p = args.path || '.'
      const fullPath = sanitizePath(activeRoot, p)
      const files = fs.readdirSync(fullPath)
      content = { result: files.join('\n') }
      logInstruction(chatId, 'LIST', p)
    } else if (normalizedName === 'delete_file') {
      const p = args.path
      const fullPath = sanitizePath(activeRoot, p)
      fs.unlinkSync(fullPath)
      content = { result: `Success: Deleted ${p}` }
      logInstruction(chatId, 'DELETE', p)
    } else if (normalizedName === 'move_file') {
      const src = sanitizePath(activeRoot, args.source)
      const dst = sanitizePath(activeRoot, args.destination)
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      fs.renameSync(src, dst)
      content = { result: `Success: Moved ${args.source} to ${args.destination}` }
      logInstruction(chatId, 'MOVE', `${args.source} -> ${args.destination}`)
    } else if (normalizedName === 'search_repo') {
      const query = args.query
      const caseFlag = args.case_insensitive ? '-i' : ''
      try {
        const output = execSync(
          `grep -r ${caseFlag} --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist "${query.replace(/"/g, '\\"')}" .`,
          { cwd: activeRoot },
        ).toString()
        content = { result: output }
      } catch (e: any) {
        if (e.status === 1) {
          content = { result: 'No results found.' }
        } else {
          throw e
        }
      }
      logInstruction(chatId, 'SEARCH', query)
    } else if (normalizedName === 'list_files') {
      const p = args.path || '.'
      const fullPath = sanitizePath(activeRoot, p)
      const output = execSync(
        `find ${p} -maxdepth 4 -not -path "*/.*" -not -path "*/node_modules/*" -not -path "*/dist/*"`,
        { cwd: activeRoot },
      ).toString()
      content = { result: output }
      logInstruction(chatId, 'LIST_FILES', p)
    } else if (normalizedName === 'git_diff_summary') {
      const output = execSync('git diff --stat', { cwd: activeRoot }).toString()
      content = { result: output || 'No changes.' }
      logInstruction(chatId, 'GIT', 'diff --stat')
    } else if (normalizedName === 'run_shell') {
      const cmd = args.command
      if (!isShellCommandSafe(cmd)) {
        throw new Error('Access denied: Dangerous shell command detected.')
      }
      content = { result: execSync(cmd, { cwd: activeRoot }).toString() }
      logInstruction(chatId, 'SHELL', cmd)
    } else if (normalizedName === 'git_status') {
      content = { result: execSync('git status', { cwd: activeRoot }).toString() }
      logInstruction(chatId, 'GIT', 'status')
    } else if (normalizedName === 'git_log') {
      const limit = args.limit || 10
      content = {
        result: execSync(`git log -n ${limit} --oneline`, { cwd: activeRoot }).toString(),
      }
      logInstruction(chatId, 'GIT', `log -n ${limit}`)
    } else if (normalizedName === 'git_diff') {
      const cmd = args.cached ? 'git diff --cached' : 'git diff'
      content = { result: execSync(cmd, { cwd: activeRoot }).toString() }
      logInstruction(chatId, 'GIT', args.cached ? 'diff --cached' : 'diff')
    } else if (normalizedName === 'git_add') {
      execSync(`git add ${args.path}`, { cwd: activeRoot })
      content = { result: `Success: Added ${args.path}` }
      logInstruction(chatId, 'GIT', `add ${args.path}`)
    } else if (normalizedName === 'git_commit') {
      execSync(`git commit -m "${args.message.replace(/"/g, '\\"')}"`, { cwd: activeRoot })
      content = { result: `Success: Committed with message: ${args.message}` }
      logInstruction(chatId, 'GIT', `commit -m "${args.message}"`)
    } else if (normalizedName === 'git_push') {
      const remote = args.remote || 'origin'
      const branch = args.branch || 'HEAD'

      let preFlightResult = ''
      if (args.run_tests) {
        try {
          logInstruction(chatId, 'CHECK', 'Running pre-push tests...')
          execSync('npm test', { cwd: activeRoot })
          preFlightResult = '✅ Pre-flight tests passed.\n'
        } catch (e: any) {
          throw new Error(
            `Push aborted: Pre-flight tests failed.\n${e.stdout?.toString() || e.message}`,
            { cause: e },
          )
        }
      }

      execSync(`git push ${remote} ${branch}`, { cwd: activeRoot })
      content = { result: `${preFlightResult}Success: Pushed to ${remote} ${branch}` }
      logInstruction(chatId, 'GIT', `push ${remote} ${branch}`)
    } else if (normalizedName === 'pre_flight_check') {
      try {
        const testOutput = execSync('npm test', { cwd: activeRoot }).toString()
        content = { result: `✅ Pre-flight check passed:\n\n${testOutput}` }
      } catch (e: any) {
        content = { error: `❌ Pre-flight check failed:\n\n${e.stdout?.toString() || e.message}` }
      }
      logInstruction(chatId, 'CHECK', 'pre-flight')
    } else if (normalizedName === 'format_file') {
      const p = args.path
      const fullPath = sanitizePath(activeRoot, p)
      const ext = path.extname(p)
      let command = ''

      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md'].includes(ext)) {
        command = `npx prettier --write "${p}"`
      } else if (ext === '.py') {
        command = `black "${p}"`
      } else if (ext === '.go') {
        command = `go fmt "${p}"`
      } else if (ext === '.rs') {
        command = `rustfmt "${p}"`
      }

      if (command) {
        try {
          const output = execSync(command, { cwd: activeRoot }).toString()
          content = { result: `Success: Formatted ${p}\n${output}` }
        } catch (e: any) {
          content = { error: `Formatting failed: ${e.stdout?.toString() || e.message}` }
        }
      } else {
        content = { error: `No formatting tool found for extension ${ext}` }
      }
      logInstruction(chatId, 'FORMAT', p)
    } else if (normalizedName === 'lint_file') {
      const p = args.path
      const fix = args.fix
      const fullPath = sanitizePath(activeRoot, p)
      const ext = path.extname(p)
      let command = ''

      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        command = `npx eslint ${fix ? '--fix' : ''} "${p}"`
      } else if (ext === '.py') {
        command = `pylint "${p}"`
      }

      if (command) {
        try {
          const output = execSync(command, { cwd: activeRoot }).toString()
          content = { result: `Linting passed for ${p}\n${output}` }
        } catch (e: any) {
          content = { error: `Linting failed: ${e.stdout?.toString() || e.message}` }
        }
      } else {
        content = { error: `No linting tool found for extension ${ext}` }
      }
      logInstruction(chatId, 'LINT', p)
    } else if (normalizedName === 'run_tests') {
      const p = args.path || ''
      const pattern = args.pattern || ''
      let command = 'npm test'

      if (p || pattern) {
        command += ' --'
        if (p) command += ` ${p}`
        if (pattern) command += ` -t "${pattern}"`
      }

      try {
        const output = execSync(command, { cwd: activeRoot }).toString()
        content = { result: `Tests passed:\n\n${output}` }
      } catch (e: any) {
        content = { error: `Tests failed:\n\n${e.stdout?.toString() || e.message}` }
      }
      logInstruction(chatId, 'TEST', `${p} ${pattern}`.trim())
    } else if (normalizedName === 'git_checkout') {
      const flag = args.create ? '-b' : ''
      execSync(`git checkout ${flag} ${args.branch}`, { cwd: activeRoot })
      content = { result: `Success: Checked out ${args.branch}` }
      logInstruction(chatId, 'GIT', `checkout ${flag} ${args.branch}`)
    } else if (normalizedName === 'git_branch') {
      if (args.delete) {
        execSync(`git branch -D ${args.delete}`, { cwd: activeRoot })
        content = { result: `Success: Deleted branch ${args.delete}` }
        logInstruction(chatId, 'GIT', `branch -D ${args.delete}`)
      } else {
        content = { result: execSync('git branch', { cwd: activeRoot }).toString() }
        logInstruction(chatId, 'GIT', 'branch')
      }
    } else if (normalizedName === 'web_search') {
      const query = args.query
      logInstruction(chatId, 'SEARCH_WEB', query)

      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      })

      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`)
      }

      const text = await response.text()
      const results = []
      const resultRegex = /result__body">([\s\S]*?)<div class="clear">/g
      const titleRegex = /class="result__a" href="([^"]+)">([\s\S]*?)<\/a>/
      const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/

      let match
      while ((match = resultRegex.exec(text)) !== null && results.length < 5) {
        const block = match[1]
        if (!block) continue
        const titleMatch = titleRegex.exec(block)
        const snippetMatch = snippetRegex.exec(block)

        if (titleMatch && titleMatch[1]) {
          let rawUrl = titleMatch[1]
          // Handle DDG redirect URLs
          if (rawUrl.includes('uddg=')) {
            const urlMatch = rawUrl.match(/uddg=([^&]+)/)
            if (urlMatch && urlMatch[1]) {
              rawUrl = decodeURIComponent(urlMatch[1])
            }
          }

          results.push({
            title: decode(titleMatch[2]?.replace(/<[^>]*>/g, '').trim() || ''),
            url: rawUrl,
            content:
              snippetMatch && snippetMatch[1]
                ? decode(snippetMatch[1].replace(/<[^>]*>/g, '').trim())
                : '',
          })
        }
      }
      content = { result: JSON.stringify(results, null, 2) }
    } else if (normalizedName === 'http_request') {
      const { url, method = 'GET', headers = {}, body } = args
      logInstruction(chatId, 'HTTP', `${method} ${url}`)
      const response = await fetch(url, {
        method,
        headers,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      })
      const resHeaders: any = {}
      response.headers.forEach((v, k) => (resHeaders[k] = v))
      const resText = await response.text()
      let resData
      try {
        resData = JSON.parse(resText)
      } catch (e) {
        resData = resText
      }
      content = {
        result: JSON.stringify(
          {
            status: response.status,
            statusText: response.statusText,
            headers: resHeaders,
            data: resData,
          },
          null,
          2,
        ),
      }
    } else if (normalizedName === 'db_list_collections') {
      logInstruction(chatId, 'DB', 'list_collections')
      const collections = await db.listCollections()
      content = { result: collections.map((c) => c.id).join('\n') }
    } else if (normalizedName === 'db_get_collection_schema') {
      const colName = args.collection
      logInstruction(chatId, 'DB', `get_schema ${colName}`)
      const snapshot = await db.collection(colName).limit(5).get()
      const schema: any = {}
      snapshot.forEach((doc) => {
        const data = doc.data()
        for (const key in data) {
          schema[key] = typeof data[key]
        }
      })
      content = { result: JSON.stringify(schema, null, 2) }
    } else if (normalizedName === 'db_query_collection') {
      const { collection, limit = 10, where = [] } = args
      logInstruction(chatId, 'DB', `query ${collection}`)
      let query: any = db.collection(collection)
      for (const filter of where) {
        query = query.where(filter.field, filter.op, filter.value)
      }
      const snapshot = await query.limit(limit).get()
      const results: any[] = []
      snapshot.forEach((doc: any) => results.push({ id: doc.id, ...doc.data() }))
      content = { result: JSON.stringify(results, null, 2) }
    } else if (normalizedName === 'index_repo') {
      let pathsToIndex = args.paths
      if (!pathsToIndex || pathsToIndex.length === 0) {
        const output = execSync(
          'find . -maxdepth 4 -not -path "*/.*" -not -path "*/node_modules/*" -not -path "*/dist/*" -type f',
          { cwd: activeRoot },
        ).toString()
        pathsToIndex = output.split('\n').filter((p) => {
          const ext = path.extname(p)
          return ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.py', '.go', '.rs'].includes(ext)
        })
      }

      logInstruction(chatId, 'RAG', `Indexing ${pathsToIndex.length} files...`)
      for (const p of pathsToIndex) {
        if (!p) continue
        await indexFile(activeRoot, p)
      }
      content = { result: `Success: Indexed ${pathsToIndex.length} files.` }
    } else if (normalizedName === 'semantic_search') {
      logInstruction(chatId, 'RAG', `Searching: ${args.query}`)
      const results = await semanticSearch(args.query, args.limit || 5)
      content = { result: JSON.stringify(results, null, 2) }
    } else if (normalizedName === 'set_project_rule') {
      const { rule, category = 'general' } = args
      logInstruction(chatId, 'RULES', `Setting rule: ${rule}`)
      await db.collection('project_rules').add({
        rule,
        category,
        createdAt: new Date(),
      })
      content = { result: `Success: Rule added.` }
    } else if (normalizedName === 'list_project_rules') {
      logInstruction(chatId, 'RULES', 'Listing rules')
      const snapshot = await db.collection('project_rules').orderBy('createdAt', 'desc').get()
      const rules = snapshot.docs
        .map((doc) => `- [${doc.data().category}] ${doc.data().rule}`)
        .join('\n')
      content = { result: rules || 'No rules defined.' }
    } else {
      content = { error: `Unknown tool: ${name}` }
      logInstruction(chatId, 'ERROR', `Model tried to call unknown tool: ${name}`)
    }
  } catch (e: any) {
    content = { error: e.message }
    logInstruction(chatId, 'ERROR', `Tool ${normalizedName} failed: ${e.message}`)
  }
  return content
}
