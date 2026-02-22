import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConfig } from '../src/utils/config';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

vi.mock('fs');
vi.mock('js-yaml');

describe('Config Unit Tests', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should load and return config', async () => {
    const { getConfig } = await import('../src/utils/config');
    const mockYaml = 'model:\n  name: gemini-pro';
    const mockConfig = { model: { name: 'gemini-pro' } };
    
    (fs.readFileSync as any).mockReturnValue(mockYaml);
    (yaml.load as any).mockReturnValue(mockConfig);

    const config = getConfig();
    expect(config).toEqual(mockConfig);
    expect(fs.readFileSync).toHaveBeenCalled();
  });

  it('should return cached config on subsequent calls', async () => {
    const { getConfig } = await import('../src/utils/config');
    const mockConfig = { model: { name: 'gemini-pro' } };
    (yaml.load as any).mockReturnValue(mockConfig);

    const config1 = getConfig();
    const config2 = getConfig();
    
    expect(config1).toBe(config2);
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('should throw error if config loading fails', async () => {
    const { getConfig } = await import('../src/utils/config');
    (fs.readFileSync as any).mockImplementation(() => {
      throw new Error('File not found');
    });

    expect(() => getConfig()).toThrow('File not found');
  });
});
