/**
 * @fileoverview Retrieval-Augmented Generation (RAG) utilities for indexing and searching the codebase.
 */

import { embeddingModel } from '../services/gemini.js'
import { db, FieldValue } from '../services/firebase.js'
import * as fs from 'fs'
import * as path from 'path'

export interface CodeChunk {
  path: string
  content: string
  startLine: number
  endLine: number
}

/**
 * Splits a file's content into overlapping chunks for indexing.
 *
 * @param filePath - The path of the file.
 * @param content - The source code content.
 * @param chunkSize - The number of lines per chunk.
 * @param overlap - The number of overlapping lines between chunks.
 * @returns An array of CodeChunk objects.
 */
export function chunkFile(
  filePath: string,
  content: string,
  chunkSize = 1000,
  overlap = 200,
): CodeChunk[] {
  const lines = content.split('\n')
  const chunks: CodeChunk[] = []

  let currentLine = 0
  while (currentLine < lines.length) {
    const endLine = Math.min(currentLine + chunkSize, lines.length)
    const chunkContent = lines.slice(currentLine, endLine).join('\n')

    chunks.push({
      path: filePath,
      content: chunkContent,
      startLine: currentLine + 1,
      endLine: endLine,
    })

    if (endLine === lines.length) break
    currentLine += chunkSize - overlap
  }

  return chunks
}

/**
 * Generates a vector embedding for the given text using the Gemini embedding model.
 * Note: The embedding is truncated to 768 dimensions for compatibility.
 *
 * @param text - The text to embed.
 * @returns A promise that resolves to an array of numbers representing the embedding.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text)
  // Truncate to 768 dimensions as gemini-embedding-001 returns 3072
  // but Firestore only supports up to 2048.
  return result.embedding.values.slice(0, 768)
}

/**
 * Indexes a file by chunking it, generating embeddings, and storing them in Firestore.
 *
 * @param repoRoot - The root directory of the repository.
 * @param relativePath - The relative path of the file to index.
 */
export async function indexFile(repoRoot: string, relativePath: string) {
  console.log(`>>> Starting indexFile for ${relativePath}`)
  const fullPath = path.join(repoRoot, relativePath)
  if (!fs.existsSync(fullPath)) return

  const stats = fs.statSync(fullPath)
  if (stats.isDirectory()) return

  const content = fs.readFileSync(fullPath, 'utf-8')
  const chunks = chunkFile(relativePath, content)
  console.log(`  File ${relativePath} has ${chunks.length} chunks`)

  const batch = db.batch()
  const collection = db.collection('code_embeddings')

  // Delete old chunks for this file
  console.log(`  Deleting old chunks for ${relativePath}...`)
  const oldChunks = await collection.where('path', '==', relativePath).get()
  oldChunks.forEach((doc) => batch.delete(doc.ref))

  for (const [i, chunk] of chunks.entries()) {
    console.log(`  Embedding chunk ${i + 1}/${chunks.length}...`)
    const embedding = await getEmbedding(chunk.content)
    const docRef = collection.doc()
    batch.set(docRef, {
      ...chunk,
      embedding: FieldValue.vector(embedding),
      indexedAt: new Date(),
    })
  }

  console.log(`  Committing batch for ${relativePath}...`)
  await batch.commit()
}

/**
 * Performs a semantic search across the indexed codebase using vector similarity.
 *
 * @param query - The natural language query.
 * @param limit - The maximum number of results to return.
 * @returns A promise that resolves to an array of matching document data.
 */
export async function semanticSearch(query: string, limit = 5) {
  const queryEmbedding = await getEmbedding(query)
  const collection = db.collection('code_embeddings')

  const snapshot = await collection
    .findNearest('embedding', FieldValue.vector(queryEmbedding), {
      limit: limit,
      distanceMeasure: 'COSINE',
    })
    .get()

  return snapshot.docs.map((doc) => doc.data())
}
