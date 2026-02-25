/**
 * @fileoverview Supervisor script to keep the bot running in polling mode.
 * Automatically restarts the bot if it crashes or exits.
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Spawns the main bot process and sets up restart logic on exit or error.
 */
function launch() {
  console.log('🚀 [Supervisor] Starting bot process...')

  const child = spawn('npx', ['tsx', 'main.ts', '--poll'], {
    stdio: 'inherit',
    cwd: __dirname,
    shell: true,
  })

  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ [Supervisor] Bot exited normally. Restarting in 2 seconds...')
    } else {
      console.log(`❌ [Supervisor] Bot crashed with exit code ${code}. Restarting in 5 seconds...`)
    }

    setTimeout(launch, code === 0 ? 2000 : 5000)
  })

  child.on('error', (err) => {
    console.error('🔥 [Supervisor] Failed to start bot:', err)
    setTimeout(launch, 10000)
  })
}

launch()
