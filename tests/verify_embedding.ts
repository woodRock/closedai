import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
dotenv.config()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

async function test() {
  console.log('Testing text-embedding-004 with v1...')
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' }, { apiVersion: 'v1' })
    const result = await model.embedContent('Hello world')
    console.log('Success! Embedding length:', result.embedding.values.length)
  } catch (e) {
    console.error('Failed:', e)
  }
}

test()
