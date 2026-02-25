/**
 * @fileoverview Configuration loader for the application, reading from config.yaml.
 */

import * as yaml from 'js-yaml'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.resolve(__dirname, '../../config.yaml')

interface Config {
  model: {
    name: string
    temperature: number
  }
  timeout: number
  chat: {
    history_limit: number
  }
  log: {
    limit: number
  }
}

let config: Config | null = null

/**
 * Loads and returns the application configuration from the config.yaml file.
 * Caches the configuration after the first load.
 *
 * @returns The application configuration object.
 * @throws {Error} If the configuration file cannot be read or parsed.
 */
export function getConfig(): Config {
  if (config) {
    return config
  }

  try {
    const yamlString = fs.readFileSync(configPath, 'utf8')
    config = yaml.load(yamlString) as Config
    return config
  } catch (e) {
    console.error('Failed to load config.yaml:', e)
    throw e
  }
}
