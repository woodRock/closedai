import { Parser, Language, Query } from 'web-tree-sitter';
import * as path from 'path';
import * as fs from 'fs';

let isInitialized = false;
let parser: Parser | null = null;
const langCache: Record<string, Language> = {};

async function initialize() {
  if (isInitialized) return;
  await Parser.init();
  parser = new Parser();
  isInitialized = true;
}

const LANG_WASM_MAP: Record<string, string> = {
  '.ts': 'tree-sitter-typescript.wasm',
  '.tsx': 'tree-sitter-typescript.wasm',
  '.js': 'tree-sitter-javascript.wasm',
  '.jsx': 'tree-sitter-javascript.wasm',
  '.py': 'tree-sitter-python.wasm',
  '.go': 'tree-sitter-go.wasm',
  '.rs': 'tree-sitter-rust.wasm',
  '.java': 'tree-sitter-java.wasm',
  '.cpp': 'tree-sitter-cpp.wasm',
  '.hpp': 'tree-sitter-cpp.wasm',
  '.cc': 'tree-sitter-cpp.wasm',
  '.c': 'tree-sitter-c.wasm',
  '.h': 'tree-sitter-c.wasm',
};

const LANG_QUERY_MAP: Record<string, string> = {
  'tree-sitter-typescript.wasm': `
    (class_declaration name: (type_identifier) @name) @symbol
    (function_declaration name: (identifier) @name) @symbol
    (method_definition name: (property_identifier) @name) @symbol
    (interface_declaration name: (type_identifier) @name) @symbol
  `,
  'tree-sitter-javascript.wasm': `
    (class_declaration name: (identifier) @name) @symbol
    (function_declaration name: (identifier) @name) @symbol
    (method_definition name: (property_identifier) @name) @symbol
  `,
  'tree-sitter-python.wasm': `
    (class_definition name: (identifier) @name) @symbol
    (function_definition name: (identifier) @name) @symbol
  `,
  'tree-sitter-go.wasm': `
    (function_declaration name: (identifier) @name) @symbol
    (method_declaration name: (field_identifier) @name) @symbol
    (type_declaration (type_spec name: (type_identifier) @name)) @symbol
  `,
  'tree-sitter-rust.wasm': `
    (function_item name: (identifier) @name) @symbol
    (struct_item name: (type_identifier) @name) @symbol
    (enum_item name: (type_identifier) @name) @symbol
    (trait_item name: (type_identifier) @name) @symbol
    (impl_item type: (type_identifier) @name) @symbol
    (mod_item name: (identifier) @name) @symbol
  `,
  'tree-sitter-java.wasm': `
    (class_declaration name: (identifier) @name) @symbol
    (method_declaration name: (identifier) @name) @symbol
    (interface_declaration name: (identifier) @name) @symbol
    (enum_declaration name: (identifier) @name) @symbol
  `,
  'tree-sitter-cpp.wasm': `
    (class_specifier name: (type_identifier) @name) @symbol
    (function_definition declarator: (function_declarator declarator: (identifier) @name)) @symbol
    (struct_specifier name: (type_identifier) @name) @symbol
    (namespace_definition name: (identifier) @name) @symbol
  `,
  'tree-sitter-c.wasm': `
    (function_definition declarator: (function_declarator declarator: (identifier) @name)) @symbol
    (struct_specifier name: (type_identifier) @name) @symbol
    (type_definition declarator: (type_identifier) @name) @symbol
  `,
};

async function getLanguage(extension: string) {
  const wasmFile = LANG_WASM_MAP[extension];
  if (!wasmFile) return null;

  if (langCache[wasmFile]) return langCache[wasmFile];

  const wasmPath = path.join(process.cwd(), 'vendor', 'tree-sitter', wasmFile);
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM file for ${extension} not found at ${wasmPath}`);
  }
  
  const lang = await Language.load(wasmPath);
  langCache[wasmFile] = lang;
  return lang;
}

export interface SymbolInfo {
  name: string;
  type: string;
  start: { row: number; column: number };
  end: { row: number; column: number };
  children?: SymbolInfo[];
}

export async function getFileOutline(filePath: string, content: string): Promise<SymbolInfo[]> {
  await initialize();
  const ext = path.extname(filePath);
  const lang = await getLanguage(ext);
  if (!lang || !parser) {
    throw new Error(`Unsupported language for file: ${filePath}`);
  }

  parser.setLanguage(lang);
  const tree = parser.parse(content);
  if (!tree) {
    throw new Error('Failed to parse content');
  }

  try {
    const wasmFile = LANG_WASM_MAP[ext];
    if (!wasmFile) {
       throw new Error(`WASM file for ${ext} not found`);
    }
    const queryString = LANG_QUERY_MAP[wasmFile];
    
    if (!queryString) {
      // Fallback to basic traversal if no query defined
      return getLegacyOutline(tree.rootNode);
    }

    const query = new Query(lang, queryString);
    const captures = query.captures(tree.rootNode);
    const symbols: SymbolInfo[] = [];

    // Group captures by their 'symbol' node
    const symbolMap = new Map<any, Partial<SymbolInfo>>();

    for (const capture of captures) {
      if (capture.name === 'symbol') {
        symbolMap.set(capture.node.id, {
          type: capture.node.type,
          start: { row: capture.node.startPosition.row, column: capture.node.startPosition.column },
          end: { row: capture.node.endPosition.row, column: capture.node.endPosition.column },
        });
      }
    }

    for (const capture of captures) {
      if (capture.name === 'name') {
        // Find the parent symbol node
        let parent = capture.node.parent;
        while (parent) {
          if (symbolMap.has(parent.id)) {
            break;
          }
          parent = parent.parent;
        }
        if (parent) {
          const symbol = symbolMap.get(parent.id);
          if (symbol) {
            symbol.name = capture.node.text;
          }
        }
      }
    }

    for (const symbol of symbolMap.values()) {
      if (symbol.name) {
        symbols.push(symbol as SymbolInfo);
      }
    }

    return symbols;
  } finally {
    tree.delete();
  }
}

function getLegacyOutline(rootNode: any): SymbolInfo[] {
  const symbols: SymbolInfo[] = [];

  function traverse(node: any) {
    if (
      node.type === 'class_declaration' ||
      node.type === 'function_declaration' ||
      node.type === 'method_definition' ||
      node.type === 'interface_declaration' ||
      node.type === 'function_item'
    ) {
      const nameNode = node.childForFieldName('name') || node.children.find((c: any) => c.type === 'identifier');
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          type: node.type,
          start: { row: node.startPosition.row, column: node.startPosition.column },
          end: { row: node.endPosition.row, column: node.endPosition.column },
          children: []
        });
      }
    }

    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(rootNode);
  return symbols;
}

