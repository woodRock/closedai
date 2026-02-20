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
    expect(execSync).toHaveBeenCalledWith('grep -r "search-term" .', { cwd: repoRoot });
    expect(result).toEqual({ result: 'match1\nmatch2' });
  });

  it('run_shell should call execSync', async () => {
    (execSync as any).mockReturnValue(Buffer.from('shell output'));
    const result = await executeTool('run_shell', { command: 'echo hello' }, repoRoot, chatId, mockSafeSendMessage);
    expect(execSync).toHaveBeenCalledWith('echo hello', { cwd: repoRoot });
    expect(result).toEqual({ result: 'shell output' });
  });

  it('should return error if tool fails', async () => {
    (execSync as any).mockImplementation(() => { throw new Error('bash error'); });
    const result = await executeTool('run_shell', { command: 'fail' }, repoRoot, chatId, mockSafeSendMessage);
    expect(result).toEqual({ error: 'bash error' });
  });
});
