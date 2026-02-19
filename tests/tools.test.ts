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

  it('run_shell should call execSync', async () => {
    (execSync as any).mockReturnValue(Buffer.from('shell output'));
    const result = await executeTool('run_shell', { command: 'echo hello' }, repoRoot, chatId, mockSafeSendMessage);
    expect(execSync).toHaveBeenCalledWith('echo hello', { cwd: repoRoot });
    expect(result).toEqual({ result: 'shell output' });
  });

  it('reply should call safeSendMessage', async () => {
    const result = await executeTool('reply', { text: 'hello user' }, repoRoot, chatId, mockSafeSendMessage);
    expect(mockSafeSendMessage).toHaveBeenCalledWith(chatId, 'hello user');
    expect(result).toEqual({ result: 'Sent.' });
  });

  it('should return error if tool fails', async () => {
    (execSync as any).mockImplementation(() => { throw new Error('bash error'); });
    const result = await executeTool('run_shell', { command: 'fail' }, repoRoot, chatId, mockSafeSendMessage);
    expect(result).toEqual({ error: 'bash error' });
  });
});
