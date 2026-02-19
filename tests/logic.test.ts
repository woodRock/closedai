import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { processOneMessage, checkQueue } from '../src/bot/logic';
import { db } from '../src/services/firebase';
import { model } from '../src/services/gemini';
import { bot } from '../src/bot/instance';

vi.mock('../src/services/firebase', () => {
  const mockCollection = vi.fn();
  const mockDb = { collection: mockCollection };
  
  mockCollection.mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'mock-id' }),
    doc: vi.fn().mockReturnValue({
      delete: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
    }),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0, forEach: vi.fn() }),
  });

  return {
    db: mockDb,
    FieldValue: {
      serverTimestamp: vi.fn(() => 'mock-timestamp'),
      increment: vi.fn((n) => n),
    },
  };
});

vi.mock('../src/services/gemini', () => ({
  model: {
    startChat: vi.fn(),
  },
}));

vi.mock('../src/bot/instance', () => ({
  bot: {
    telegram: {
      sendMessage: vi.fn().mockResolvedValue({}),
      sendChatAction: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('child_process', () => ({
  execSync: vi.fn().mockReturnValue(Buffer.from('')),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue('{}'),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe('Core Logic Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_TELEGRAM_USER_IDS = '12345';
  });

  describe('processOneMessage - Access Control', () => {
    it('should deny access if user is not allowed', async () => {
      await processOneMessage('hello', 999, '/tmp/repo');
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(999, "🛡️ Access Denied.", expect.anything());
    });
  });

  describe('processOneMessage - Gemini Interaction', () => {
    it('should process a simple message and call Gemini', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue({
        response: {
          functionCalls: () => [],
          text: () => 'Hello from Gemini',
        },
      });

      (model.startChat as any).mockReturnValue({
        sendMessage: mockSendMessage,
      });

      await processOneMessage('hello', 12345, '/tmp/repo');

      expect(db.collection).toHaveBeenCalledWith('history');
      expect(model.startChat).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith('hello');
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, 'Hello from Gemini', expect.anything());
    });

    it('should handle tool calls (e.g., run_shell)', async () => {
      const mockSendMessage = vi.fn()
        .mockResolvedValueOnce({
          response: {
            functionCalls: () => [{ name: 'run_shell', args: { command: 'ls' } }],
            text: () => '',
          },
        })
        .mockResolvedValueOnce({
          response: {
            functionCalls: () => [],
            text: () => 'Tool result processed',
          },
        });

      (model.startChat as any).mockReturnValue({
        sendMessage: mockSendMessage,
      });

      (execSync as any).mockImplementation((cmd: string) => {
        if (cmd === 'ls') return Buffer.from('file1\nfile2');
        return Buffer.from('');
      });

      await processOneMessage('list files', 12345, '/tmp/repo');

      expect(mockSendMessage).toHaveBeenCalledTimes(2);
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, 'Tool result processed', expect.anything());
    });

    it('should handle Gemini 503 errors and queue the message', async () => {
      const error503: any = new Error('Service Unavailable');
      error503.status = 503;

      (model.startChat as any).mockReturnValue({
        sendMessage: vi.fn().mockRejectedValue(error503),
      });

      await processOneMessage('important task', 12345, '/tmp/repo');

      expect(db.collection).toHaveBeenCalledWith('queue');
      // Should find the .add call for the queue
      const queueCollection = (db.collection as any).mock.results.find((r: any) => r.value && r.value.add && (db.collection as any).mock.calls.some((c: any) => c[0] === 'queue'));
      expect(db.collection).toHaveBeenCalledWith('queue');
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, expect.stringContaining("queued"), expect.anything());
    });
  });

  describe('Command Handlers', () => {
    it('should handle /ping', async () => {
      await processOneMessage('/ping', 12345, '/tmp/repo');
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, "🏓 Pong!", expect.anything());
    });

    it('should handle /help', async () => {
      await processOneMessage('/help', 12345, '/tmp/repo');
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, expect.stringContaining("ClosedAI Help"), expect.anything());
    });

    it('should handle /status', async () => {
      (execSync as any).mockReturnValue(Buffer.from('mock-value'));
      await processOneMessage('/status', 12345, '/tmp/repo');
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, expect.stringContaining("System Status"), expect.anything());
    });

    it('should handle /log', async () => {
      const mockDocs = [
        { data: () => ({ timestamp: { toDate: () => new Date() }, text: 'msg1', chatId: 12345 }) },
      ];
      (db.collection as any)().get.mockResolvedValueOnce({ empty: false, docs: mockDocs, reverse: () => mockDocs });

      await processOneMessage('/log', 12345, '/tmp/repo');
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, expect.stringContaining("Recent Commands"), expect.anything());
    });
  });

  describe('Queue System', () => {
    it('should do nothing if queue is empty', async () => {
      (db.collection as any)().get.mockResolvedValueOnce({ empty: true });
      await checkQueue('/tmp/repo');
      expect(model.startChat).not.toHaveBeenCalled();
    });

    it('should process a message from the queue', async () => {
      const mockDoc = {
        id: 'queued-msg-id',
        data: () => ({ userMessage: 'retry me', chatId: 12345 }),
        ref: { update: vi.fn().mockResolvedValue({}) },
      };
      (db.collection as any)().get.mockResolvedValueOnce({ 
        empty: false, 
        docs: [mockDoc] 
      });

      // Mock Gemini for the processed message
      const mockSendMessage = vi.fn().mockResolvedValue({
        response: { functionCalls: () => [], text: () => 'Retried successfully' },
      });
      (model.startChat as any).mockReturnValue({ sendMessage: mockSendMessage });

      await checkQueue('/tmp/repo');

      expect(mockDoc.ref.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing' }));
      expect(mockSendMessage).toHaveBeenCalledWith('retry me');
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, 'Retried successfully', expect.anything());
    });
  });
});
