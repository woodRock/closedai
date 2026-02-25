import { getEmbedding } from './src/utils/rag.js';

async function test() {
  console.log('Testing Gemini Embedding...');
  try {
    const embedding = await getEmbedding('Hello world');
    console.log('Embedding length:', embedding.length);
    console.log('First 5 values:', embedding.slice(0, 5));
  } catch (e) {
    console.error('Embedding failed:', e);
  }
}

test().catch(console.error);
