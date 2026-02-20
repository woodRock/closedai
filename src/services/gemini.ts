import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolDefinitions } from "../tools";
import { getConfig } from "../utils/config";

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

export { genAI };
