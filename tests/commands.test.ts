import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSystemCommands } from '../src/bot/commands';
import { db } from '../src/services/firebase';
import { execSync } from 'child_process';

vi.mock('../src/services/firebase', () => {
  const mockCollection = vi.fn();
  const mockDb = { collection: mockCollection };
  
  mockCollection.mockReturnValue({
    add: vi.fn(),
    doc: vi.fn(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ 
        empty: true, 
        docs: [], 
        size: 0, 
        forEach: vi.fn() 
    }),
  });

  return {
    db: mockDb,
    FieldValue: {
      serverTimestamp: vi.fn(() => 'mock-timestamp'),
      increment: vi.fn((n) => n),
    },
  };
});

vi.mock('child_process', () => ({
  execSync: vi.fn().mockReturnValue(Buffer.from('mock-output')),
}));

describe('Commands Unit Tests', () => {
  const chatId = 12345;
  const repoRoot = '/test/root';
  const safeSendMessage = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for unknown command', async () => {
    const result = await handleSystemCommands('not-a-command', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(false);
  });

  it('should handle /ping', async () => {
    const result = await handleSystemCommands('/ping', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, "🏓 Pong!");
  });

  it('should handle /help', async () => {
    const result = await handleSystemCommands('/help', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("ClosedAI Help"));
  });

  it('should handle /status', async () => {
    const result = await handleSystemCommands('/status', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("System Status"));
    expect(execSync).toHaveBeenCalled();
  });

  it('should handle /git', async () => {
    (execSync as any).mockReturnValueOnce(Buffer.from('main')).mockReturnValueOnce(Buffer.from(' M file.ts'));
    const result = await handleSystemCommands('/git', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("Branch:* main"));
  });

  it('should handle /gitlog', async () => {
    (execSync as any).mockReturnValue(Buffer.from('abc - commit message'));
    const result = await handleSystemCommands('/gitlog', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("abc - commit message"));
  });

  it('should handle /diff', async () => {
    (execSync as any).mockReturnValueOnce(Buffer.from('file.ts | 2 +-')).mockReturnValueOnce(Buffer.from('diff content'));
    const result = await handleSystemCommands('/diff', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("Working Directory Changes"));
  });

  it('should handle /diff with no changes', async () => {
    (execSync as any).mockReturnValue(Buffer.from(''));
    const result = await handleSystemCommands('/diff', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, "✅ No changes in working directory.");
  });

  it('should handle /queue when empty', async () => {
    const result = await handleSystemCommands('/queue', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, "📭 Queue is empty.");
  });

  it('should handle /queue when not empty', async () => {
    const mockDocs = [
      { data: () => ({ userMessage: 'test message', attempts: 1 }) }
    ];
    (db.collection as any)().get.mockResolvedValueOnce({ empty: false, size: 1, forEach: (cb: any) => mockDocs.forEach(cb) });
    
    const result = await handleSystemCommands('/queue', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("Current Queue (1)"));
  });

  it('should handle /log with no history', async () => {
    const result = await handleSystemCommands('/log', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, "No history found.");
  });

  it('should handle /log with history', async () => {
    const mockDocs = [
      { data: () => ({ timestamp: { toDate: () => new Date() }, role: 'user', chatId: 12345, text: 'hello' }) }
    ];
    (db.collection as any)().get.mockResolvedValueOnce({ 
        empty: false, 
        docs: mockDocs,
        reverse: () => mockDocs
    });

    const result = await handleSystemCommands('/log 5', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("Recent Activity"));
  });

  it('should handle /stats', async () => {
    const mockDocs = [
      { data: () => ({ role: 'user', chatId: '12345' }) },
      { data: () => ({ role: 'model', chatId: '12345' }) }
    ];
    (db.collection as any)().get.mockResolvedValueOnce({ 
        size: 2,
        forEach: (cb: any) => mockDocs.forEach(cb) 
    });

    const result = await handleSystemCommands('/stats', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("Usage Statistics"));
  });

  it('should handle /restart', async () => {
    vi.useFakeTimers();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    const result = await handleSystemCommands('/restart', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, "🔄 Restarting bot...");
    
    vi.runAllTimers();
    expect(exitSpy).toHaveBeenCalledWith(0);
    vi.useRealTimers();
  });

  it('should handle /gitlog error', async () => {
    (execSync as any).mockImplementation(() => { throw new Error('git error'); });
    const result = await handleSystemCommands('/gitlog', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("❌ Failed to fetch git log"));
  });

  it('should handle /diff error', async () => {
    (execSync as any).mockImplementation(() => { throw new Error('diff error'); });
    const result = await handleSystemCommands('/diff', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("❌ Failed to fetch diff"));
  });

  it('should handle /git error', async () => {
    (execSync as any).mockImplementation(() => { throw new Error('git error'); });
    const result = await handleSystemCommands('/git', chatId, repoRoot, safeSendMessage);
    expect(result).toBe(true);
    expect(safeSendMessage).toHaveBeenCalledWith(chatId, expect.stringContaining("❌ Failed to fetch git info"));
  });
});
