import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { executeTool } from '../src/tools/index';

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

  it('web_search should call Tavily API', async () => {
    const mockResults = [{ title: 'Test', url: 'http://test.com', content: 'test content' }];
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults })
    });

    const result = await executeTool('web_search', { query: 'test query' }, repoRoot, chatId, mockSafeSendMessage);
    
    expect(global.fetch).toHaveBeenCalledWith("https://api.tavily.com/search", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        api_key: 'test-key',
        query: 'test query',
        search_depth: "basic",
        max_results: 5
      })
    }));
    expect(result).toEqual({ result: JSON.stringify(mockResults, null, 2) });
  });

  it('web_search should throw error if TAVILY_API_KEY is missing', async () => {
    delete process.env.TAVILY_API_KEY;
    const result = await executeTool('web_search', { query: 'test query' }, repoRoot, chatId, mockSafeSendMessage);
    expect(result).toEqual({ error: 'TAVILY_API_KEY is not set in environment variables. Please add it to your .env file.' });
  });
});
