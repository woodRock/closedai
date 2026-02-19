import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'config.yaml');

interface Config {
  model: {
    name: string;
    temperature: number;
  };
  timeout: number;
  chat: {
    history_limit: number;
  };
  log:
  {
    limit:number
  }
}

let config: Config | null = null;

export function getConfig(): Config {
  if (config) {
    return config;
  }

  try {
    const yamlString = fs.readFileSync(configPath, 'utf8');
    config = yaml.load(yamlString) as Config;
    return config;
  } catch (e) {
    console.error('Failed to load config.yaml:', e);
    throw e;
  }
}
