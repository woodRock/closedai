import { describe, it, expect } from 'vitest'
import { getFileOutline } from '../src/utils/code-intelligence'
import * as fs from 'fs'
import * as path from 'path'

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
    `

    // Create a temporary file for testing
    const tempFilePath = 'test-outline.ts'

    try {
      const outline = await getFileOutline(tempFilePath, code)

      const names = outline.map((s) => s.name)
      expect(names).toContain('MyClass')
      expect(names).toContain('myMethod')
      expect(names).toContain('topLevelFunction')
      expect(names).toContain('MyInterface')

      const myClass = outline.find((s) => s.name === 'MyClass')
      expect(myClass?.type).toBe('class_declaration')

      const myMethod = outline.find((s) => s.name === 'myMethod')
      expect(myMethod?.type).toBe('method_definition')
    } catch (error) {
      // If WASM files are not found or incompatible, this might fail in this environment
      // but the logic itself is what we are testing.
      console.error('Outline test failed:', error)
      throw error
    }
  })

  it('should throw error for unsupported extensions', async () => {
    await expect(getFileOutline('test.txt', 'some text')).rejects.toThrow('Unsupported language')
  })

  it('should extract symbols from a Go file', async () => {
    const code = `
      package main
      type MyStruct struct { Name string }
      func (m *MyStruct) MyMethod() {}
      func MyFunction() {}
    `
    const outline = await getFileOutline('test.go', code)
    const names = outline.map((s) => s.name)
    expect(names).toContain('MyStruct')
    expect(names).toContain('MyMethod')
    expect(names).toContain('MyFunction')
  })

  it('should extract symbols from a Rust file', async () => {
    const code = `
      struct MyStruct { name: String }
      impl MyStruct {
          fn my_method(&self) {}
      }
      fn my_function() {}
      enum MyEnum { A, B }
      trait MyTrait {}
      mod my_mod {}
    `
    const outline = await getFileOutline('test.rs', code)
    const names = outline.map((s) => s.name)
    expect(names).toContain('MyStruct')
    expect(names).toContain('MyStruct') // From impl
    expect(names).toContain('my_function')
    expect(names).toContain('MyEnum')
    expect(names).toContain('MyTrait')
    expect(names).toContain('my_mod')
  })

  it('should extract symbols from a Java file', async () => {
    const code = `
      public class MyClass {
          public void myMethod() {}
      }
      interface MyInterface {}
      enum MyEnum {}
    `
    const outline = await getFileOutline('test.java', code)
    const names = outline.map((s) => s.name)
    expect(names).toContain('MyClass')
    expect(names).toContain('myMethod')
    expect(names).toContain('MyInterface')
    expect(names).toContain('MyEnum')
  })

  it('should extract symbols from a C++ file', async () => {
    const code = `
      class MyClass {
      public:
          void myMethod() {}
      };
      struct MyStruct {};
      void myFunction() {}
      namespace myNamespace {}
    `
    const outline = await getFileOutline('test.cpp', code)
    const names = outline.map((s) => s.name)
    expect(names).toContain('MyClass')
    expect(names).toContain('myFunction')
    expect(names).toContain('MyStruct')
  })

  it('should extract symbols from a C file', async () => {
    const code = `
      void myFunction() {}
      struct MyStruct { int x; };
      typedef int MyInt;
    `
    const outline = await getFileOutline('test.c', code)
    const names = outline.map((s) => s.name)
    expect(names).toContain('myFunction')
    expect(names).toContain('MyStruct')
    expect(names).toContain('MyInt')
  })
})
