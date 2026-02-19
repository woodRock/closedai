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
    generateContentStream: vi.fn(),
  },
}));

vi.mock('../src/bot/instance', () => ({
  bot: {
    telegram: {
      sendMessage: vi.fn().mockResolvedValue({}),
      editMessageText: vi.fn().mockResolvedValue({}),
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
      const mockGenerateContentStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          yield {
            candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }],
            text: () => 'Hello from Gemini',
          };
        })(),
        response: Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }],
          functionCalls: () => [],
        }),
      });

      (model.generateContentStream as any).mockImplementation(mockGenerateContentStream);

      await processOneMessage('hello', 12345, '/tmp/repo');

      expect(db.collection).toHaveBeenCalledWith('history');
      expect(model.generateContentStream).toHaveBeenCalled();
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, 'Hello from Gemini', expect.anything());
    });

    it('should handle tool calls (e.g., run_shell)', async () => {
      const mockGenerateContentStream = vi.fn()
        .mockResolvedValueOnce({
          stream: (async function* () {
            yield {
              candidates: [{ content: { parts: [{ functionCall: { name: 'run_shell', args: { command: 'ls' } } }] } }],
              text: () => '',
            };
          })(),
          response: Promise.resolve({
            candidates: [{ content: { parts: [{ functionCall: { name: 'run_shell', args: { command: 'ls' } } }] } }],
            functionCalls: () => [{ name: 'run_shell', args: { command: 'ls' } }],
          }),
        })
        .mockResolvedValueOnce({
          stream: (async function* () {
            yield {
              candidates: [{ content: { parts: [{ text: 'Tool result processed' }] } }],
              text: () => 'Tool result processed',
            };
          })(),
          response: Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Tool result processed' }] } }],
            functionCalls: () => [],
          }),
        });

      (model.generateContentStream as any).mockImplementation(mockGenerateContentStream);

      (execSync as any).mockImplementation((cmd: string) => {
        if (cmd === 'ls') return Buffer.from('file1\nfile2');
        return Buffer.from('');
      });

      await processOneMessage('list files', 12345, '/tmp/repo');

      expect(model.generateContentStream).toHaveBeenCalledTimes(2);
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, 'Tool result processed', expect.anything());
    });

    it('should handle Gemini 503 errors and queue the message', async () => {
      const error503: any = new Error('Service Unavailable');
      error503.status = 503;

      (model.generateContentStream as any).mockRejectedValue(error503);

      await processOneMessage('important task', 12345, '/tmp/repo');

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
      // 1st get (getChatHistory), 2nd get (handleSystemCommands)
      (db.collection as any)().get.mockResolvedValue({ empty: false, docs: mockDocs, reverse: () => mockDocs });

      await processOneMessage('/log', 12345, '/tmp/repo');
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, expect.stringContaining("Recent Activity"), expect.anything());
    });
  });

  describe('Queue System', () => {
    it('should do nothing if queue is empty', async () => {
      (db.collection as any)().get.mockResolvedValueOnce({ empty: true });
      await checkQueue('/tmp/repo');
      expect(model.generateContentStream).not.toHaveBeenCalled();
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
      const mockGenerateContentStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          yield {
            candidates: [{ content: { parts: [{ text: 'Retried successfully' }] } }],
            text: () => 'Retried successfully'
          };
        })(),
        response: Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'Retried successfully' }] } }],
          functionCalls: () => [],
        }),
      });
      (model.generateContentStream as any).mockImplementation(mockGenerateContentStream);

      await checkQueue('/tmp/repo');

      expect(mockDoc.ref.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing' }));
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(12345, 'Retried successfully', expect.anything());
    });
  });
});
