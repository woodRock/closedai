import { describe, it, expect } from 'vitest';
import { getFileOutline } from '../src/utils/code-intelligence';
import * as fs from 'fs';
import * as path from 'path';

describe('getFileOutline', () => {
  it('should extract classes and functions from a TypeScript file', async () => {
    const code = `
      export class MyClass {
        constructor() {}
        myMethod(a: number): string {
          return "hello";
        }
      }

      function topLevelFunction() {
        return 42;
      }

      export interface MyInterface {
        foo: string;
      }
    `;
    
    // Create a temporary file for testing
    const tempFilePath = 'test-outline.ts';
    
    try {
      const outline = await getFileOutline(tempFilePath, code);
      
      const names = outline.map(s => s.name);
      expect(names).toContain('MyClass');
      expect(names).toContain('myMethod');
      expect(names).toContain('topLevelFunction');
      expect(names).toContain('MyInterface');
      
      const myClass = outline.find(s => s.name === 'MyClass');
      expect(myClass?.type).toBe('class_declaration');
      
      const myMethod = outline.find(s => s.name === 'myMethod');
      expect(myMethod?.type).toBe('method_definition');
      
    } catch (error) {
       // If WASM files are not found or incompatible, this might fail in this environment
       // but the logic itself is what we are testing.
       console.error('Outline test failed:', error);
       throw error;
    }
  });

  it('should throw error for unsupported extensions', async () => {
    await expect(getFileOutline('test.txt', 'some text')).rejects.toThrow('Unsupported language');
  });
});
