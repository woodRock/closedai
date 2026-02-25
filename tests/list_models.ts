import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

async function list() {
  // The SDK doesn't have a direct listModels, we have to use fetch or similar if we want to see what's available via REST
  // But we can try a few common ones.
  const models = ["embedding-001", "text-embedding-004"];
  for (const m of models) {
    try {
      console.log(`Testing ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.embedContent("test");
      console.log(`Success with ${m}:`, res.embedding.values.length);
    } catch (e: any) {
      console.log(`Failed with ${m}:`, e.message);
    }
  }
}

list().catch(console.error);
