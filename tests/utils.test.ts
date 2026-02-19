import { describe, it, expect } from 'vitest';
import { truncateString, parseJsonSafe } from '../utils';

describe('utils', () => {
  describe('truncateString', () => {
    it('should not truncate if length is within limit', () => {
      const text = 'hello';
      expect(truncateString(text, 10)).toBe('hello');
    });

    it('should truncate and add a message if length exceeds limit', () => {
      const text = 'hello world';
      expect(truncateString(text, 5)).toBe('hello\n\n... (message truncated)');
    });
  });

  describe('parseJsonSafe', () => {
    it('should parse valid JSON', () => {
      const json = '{"a": 1}';
      expect(parseJsonSafe(json)).toEqual({ a: 1 });
    });

    it('should return null for invalid JSON', () => {
      const json = 'invalid json';
      expect(parseJsonSafe(json)).toBeNull();
    });
  });
});
