import { Parser, Language } from 'web-tree-sitter';
import * as path from 'path';
import * as fs from 'fs';

let isInitialized = false;

async function initializeParser() {
  if (isInitialized) return;
  await Parser.init();
  isInitialized = true;
}

const LANG_WASM_MAP: Record<string, string> = {
  '.ts': 'tree-sitter-typescript.wasm',
  '.tsx': 'tree-sitter-typescript.wasm',
  '.js': 'tree-sitter-javascript.wasm',
  '.jsx': 'tree-sitter-javascript.wasm',
  '.py': 'tree-sitter-python.wasm',
};

async function getLanguage(extension: string) {
  const wasmFile = LANG_WASM_MAP[extension];
  if (!wasmFile) return null;

  const wasmPath = path.join(process.cwd(), 'vendor', 'tree-sitter', wasmFile);
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM file for ${extension} not found at ${wasmPath}`);
  }
  return await Language.load(wasmPath);
}

export interface SymbolInfo {
  name: string;
  type: string;
  start: { row: number; column: number };
  end: { row: number; column: number };
  children?: SymbolInfo[];
}

export async function getFileOutline(filePath: string, content: string): Promise<SymbolInfo[]> {
  await initializeParser();
  const ext = path.extname(filePath);
  const lang = await getLanguage(ext);
  if (!lang) {
    throw new Error(`Unsupported language for file: ${filePath}`);
  }

  const parser = new Parser();
  parser.setLanguage(lang);
  const tree = parser.parse(content);

  const symbols: SymbolInfo[] = [];

  function traverse(node: any) {
    let symbol: SymbolInfo | null = null;

    // Simplified extraction logic - can be refined per language
    if (
      node.type === 'class_declaration' ||
      node.type === 'function_declaration' ||
      node.type === 'method_definition' ||
      node.type === 'interface_declaration' ||
      node.type === 'function_item'
    ) {
      const nameNode = node.childForFieldName('name') || node.children.find(c => c.type === 'identifier');
      if (nameNode) {
        symbol = {
          name: nameNode.text,
          type: node.type,
          start: { row: node.startPosition.row, column: node.startPosition.column },
          end: { row: node.endPosition.row, column: node.endPosition.column },
          children: []
        };
      }
    }

    if (symbol) {
      symbols.push(symbol);
      // For a flat outline we don't recurse into children for now, 
      // or we could implement a nested structure.
    }

    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(tree.rootNode);
  return symbols;
}
