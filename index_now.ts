import { indexFile } from './src/utils/rag.js'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

async function run() {
  const repoRoot = process.cwd()
  const output = execSync(
    'find . -maxdepth 4 -not -path "*/.*" -not -path "*/node_modules/*" -not -path "*/dist/*" -type f',
  ).toString()
  const pathsToIndex = output.split('\n').filter((p) => {
    const ext = path.extname(p)
    return ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'].includes(ext)
  })

  console.log(`Indexing ${pathsToIndex.length} files...`)
  for (const p of pathsToIndex) {
    if (!p) continue
    try {
      await indexFile(repoRoot, p)
      console.log(`Indexed ${p}`)
    } catch (e) {
      console.error(`Failed to index ${p}:`, e)
    }
  }
}

run().catch(console.error)
