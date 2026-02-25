import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolDefinitions } from "../tools/index.js";
import { getConfig } from "../utils/config.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const config = getConfig();

export const model = genAI.getGenerativeModel(
  {
    model: config.model.name,
    tools: toolDefinitions,
    generationConfig: {
      temperature: config.model.temperature,
    }
  },
  { timeout: config.timeout }
);

export const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

export { genAI };
