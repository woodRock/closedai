import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { executeTool } from '../src/tools/index';

vi.mock('../src/services/firebase.js', () => ({
  db: {
    listCollections: vi.fn(),
    collection: vi.fn(() => ({
      limit: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn(),
    })),
  },
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  renameSync: vi.fn(),
  existsSync: vi.fn(),
}));

describe('Tools Unit Tests', () => {
  const mockSafeSendMessage = vi.fn().mockResolvedValue({});
  const repoRoot = '/mock/root';
  const chatId = 12345;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TAVILY_API_KEY = 'test-key';
    // @ts-ignore
    global.fetch = vi.fn();
  });

  it('write_file should call fs.writeFileSync', async () => {
    const result = await executeTool('write_file', { path: 'test.txt', content: 'hello' }, repoRoot, chatId, mockSafeSendMessage);
    expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('test.txt'), 'hello');
    expect(result).toEqual({ result: 'Success: Wrote to test.txt' });
  });

  it('read_file should call fs.readFileSync', async () => {
    (fs.readFileSync as any).mockReturnValue('file content');
    const result = await executeTool('read_file', { path: 'test.txt' }, repoRoot, chatId, mockSafeSendMessage);
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('test.txt'), 'utf-8');
    expect(result).toEqual({ result: 'file content' });
  });

  it('list_directory should call fs.readdirSync', async () => {
    (fs.readdirSync as any).mockReturnValue(['file1.txt', 'dir1']);
    const result = await executeTool('list_directory', { path: 'some-dir' }, repoRoot, chatId, mockSafeSendMessage);
    expect(fs.readdirSync).toHaveBeenCalledWith(expect.stringContaining('some-dir'));
    expect(result).toEqual({ result: 'file1.txt\ndir1' });
  });

  it('delete_file should call fs.unlinkSync', async () => {
    const result = await executeTool('delete_file', { path: 'test.txt' }, repoRoot, chatId, mockSafeSendMessage);
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('test.txt'));
    expect(result).toEqual({ result: 'Success: Deleted test.txt' });
  });

  it('move_file should call fs.renameSync', async () => {
    const result = await executeTool('move_file', { source: 'old.txt', destination: 'new.txt' }, repoRoot, chatId, mockSafeSendMessage);
    expect(fs.renameSync).toHaveBeenCalledWith(expect.stringContaining('old.txt'), expect.stringContaining('new.txt'));
    expect(result).toEqual({ result: 'Success: Moved old.txt to new.txt' });
  });

  it('search_repo should call execSync with grep', async () => {
    (execSync as any).mockReturnValue(Buffer.from('match1\nmatch2'));
    const result = await executeTool('search_repo', { query: 'search-term' }, repoRoot, chatId, mockSafeSendMessage);
    expect(execSync).toHaveBeenCalledWith('grep -r  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist "search-term" .', { cwd: repoRoot });
    expect(result).toEqual({ result: 'match1\nmatch2' });
  });

  it('run_shell should call execSync', async () => {
    (execSync as any).mockReturnValue(Buffer.from('shell output'));
    const result = await executeTool('run_shell', { command: 'echo hello' }, repoRoot, chatId, mockSafeSendMessage);
    expect(execSync).toHaveBeenCalledWith('echo hello', { cwd: repoRoot });
    expect(result).toEqual({ result: 'shell output' });
  });

  it('git_push should call execSync with git push', async () => {
    const result = await executeTool('git_push', { remote: 'origin', branch: 'main' }, repoRoot, chatId, mockSafeSendMessage);
    expect(execSync).toHaveBeenCalledWith('git push origin main', { cwd: repoRoot });
    expect(result).toEqual({ result: 'Success: Pushed to origin main' });
  });

  it('git_push with run_tests should run npm test first', async () => {
    const result = await executeTool('git_push', { remote: 'origin', branch: 'main', run_tests: true }, repoRoot, chatId, mockSafeSendMessage);
    expect(execSync).toHaveBeenCalledWith('npm test', { cwd: repoRoot });
    expect(execSync).toHaveBeenCalledWith('git push origin main', { cwd: repoRoot });
    expect(result).toEqual({ result: '✅ Pre-flight tests passed.\nSuccess: Pushed to origin main' });
  });

  it('git_push should return error if npm test fails', async () => {
    (execSync as any).mockImplementation((cmd: string) => {
      if (cmd === 'npm test') throw { stdout: Buffer.from('test failure') };
      return Buffer.from('');
    });
    const result = await executeTool('git_push', { run_tests: true }, repoRoot, chatId, mockSafeSendMessage);
    expect(result).toEqual({ error: 'Push aborted: Pre-flight tests failed.\ntest failure' });
  });

  it('pre_flight_check should run npm test', async () => {
    (execSync as any).mockReturnValue(Buffer.from('all tests passed'));
    const result = await executeTool('pre_flight_check', {}, repoRoot, chatId, mockSafeSendMessage);
    expect(execSync).toHaveBeenCalledWith('npm test', { cwd: repoRoot });
    expect(result).toEqual({ result: '✅ Pre-flight check passed:\n\nall tests passed' });
  });

  it('pre_flight_check should return error if npm test fails', async () => {
    (execSync as any).mockImplementation((cmd: string) => {
      if (cmd === 'npm test') throw { stdout: Buffer.from('test failure') };
      return Buffer.from('');
    });
    const result = await executeTool('pre_flight_check', {}, repoRoot, chatId, mockSafeSendMessage);
    expect(result).toEqual({ error: '❌ Pre-flight check failed:\n\ntest failure' });
  });

  it('should return error if tool fails', async () => {
    (execSync as any).mockImplementation(() => { throw new Error('bash error'); });
    const result = await executeTool('run_shell', { command: 'fail' }, repoRoot, chatId, mockSafeSendMessage);
    expect(result).toEqual({ error: 'bash error' });
  });

  it('web_search should call DuckDuckGo', async () => {
    const mockHtml = `
      <div class="result__body">
        <a class="result__a" href="http://test.com">Test Title</a>
        <a class="result__snippet">test content</a>
      </div>
      <div class="clear"></div>
    `;
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockHtml
    });

    const result = await executeTool('web_search', { query: 'test query' }, repoRoot, chatId, mockSafeSendMessage);
    
    expect(global.fetch).toHaveBeenCalledWith(
      "https://html.duckduckgo.com/html/?q=test%20query",
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.any(String)
        })
      })
    );

    const expectedResults = [{
      title: 'Test Title',
      url: 'http://test.com',
      content: 'test content'
    }];
    expect(result).toEqual({ result: JSON.stringify(expectedResults, null, 2) });
  });

  it('web_search should return error if search fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500
    });
    const result = await executeTool('web_search', { query: 'test query' }, repoRoot, chatId, mockSafeSendMessage);
    expect(result).toEqual({ error: 'Search failed with status 500' });
  });

  describe('DX Tools', () => {
    it('format_file should run prettier for .ts files', async () => {
      (execSync as any).mockReturnValue(Buffer.from('formatted'));
      const result = await executeTool('format_file', { path: 'src/index.ts' }, repoRoot, chatId, mockSafeSendMessage);
      expect(execSync).toHaveBeenCalledWith('npx prettier --write "src/index.ts"', expect.any(Object));
      expect(result).toEqual({ result: 'Success: Formatted src/index.ts\nformatted' });
    });

    it('format_file should run black for .py files', async () => {
      (execSync as any).mockReturnValue(Buffer.from('reformatted'));
      const result = await executeTool('format_file', { path: 'main.py' }, repoRoot, chatId, mockSafeSendMessage);
      expect(execSync).toHaveBeenCalledWith('black "main.py"', expect.any(Object));
      expect(result).toEqual({ result: 'Success: Formatted main.py\nreformatted' });
    });

    it('lint_file should run eslint for .ts files', async () => {
      (execSync as any).mockReturnValue(Buffer.from('lint clean'));
      const result = await executeTool('lint_file', { path: 'src/index.ts', fix: true }, repoRoot, chatId, mockSafeSendMessage);
      expect(execSync).toHaveBeenCalledWith('npx eslint --fix "src/index.ts"', expect.any(Object));
      expect(result).toEqual({ result: 'Linting passed for src/index.ts\nlint clean' });
    });

    it('run_tests should run specific file and pattern', async () => {
      (execSync as any).mockReturnValue(Buffer.from('tests passed'));
      const result = await executeTool('run_tests', { path: 'tests/tools.test.ts', pattern: 'format_file' }, repoRoot, chatId, mockSafeSendMessage);
      expect(execSync).toHaveBeenCalledWith('npm test -- tests/tools.test.ts -t "format_file"', expect.any(Object));
      expect(result).toEqual({ result: 'Tests passed:\n\ntests passed' });
    });

    it('format_file should return error for unsupported extension', async () => {
      const result = await executeTool('format_file', { path: 'test.unknown' }, repoRoot, chatId, mockSafeSendMessage);
      expect(result).toEqual({ error: 'No formatting tool found for extension .unknown' });
    });
  });

  describe('Integration & Database Tools', () => {
    it('http_request should make a fetch call', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({ success: true })
      });

      const result = await executeTool('http_request', { url: 'https://api.example.com/test' }, repoRoot, chatId, mockSafeSendMessage);
      
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({ method: 'GET' }));
      const parsed = JSON.parse(result.result);
      expect(parsed.status).toBe(200);
      expect(parsed.data.success).toBe(true);
    });

    it('db_list_collections should list collection IDs', async () => {
      const { db } = await import('../src/services/firebase.js');
      (db.listCollections as any).mockResolvedValue([{ id: 'users' }, { id: 'messages' }]);

      const result = await executeTool('db_list_collections', {}, repoRoot, chatId, mockSafeSendMessage);
      expect(result).toEqual({ result: 'users\nmessages' });
    });

    it('db_get_collection_schema should return inferred schema', async () => {
      const { db } = await import('../src/services/firebase.js');
      const mockSnapshot = [
        { data: () => ({ name: 'John', age: 30 }) }
      ];
      (db.collection as any).mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSnapshot)
      });

      const result = await executeTool('db_get_collection_schema', { collection: 'users' }, repoRoot, chatId, mockSafeSendMessage);
      const schema = JSON.parse(result.result);
      expect(schema.name).toBe('string');
      expect(schema.age).toBe('number');
    });

    it('db_query_collection should return documents', async () => {
      const { db } = await import('../src/services/firebase.js');
      const mockSnapshot = [
        { id: '1', data: () => ({ text: 'hello' }) }
      ];
      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSnapshot)
      });

      const result = await executeTool('db_query_collection', { 
        collection: 'messages', 
        where: [{ field: 'text', op: '==', value: 'hello' }] 
      }, repoRoot, chatId, mockSafeSendMessage);
      
      const results = JSON.parse(result.result);
      expect(results[0].id).toBe('1');
      expect(results[0].text).toBe('hello');
    });
  });
});
