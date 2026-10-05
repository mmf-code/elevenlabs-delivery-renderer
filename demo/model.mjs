// The only model-specific wiring in the demo. Replace this connection with yours.
import { createGeminiGenerator } from "./adapters/gemini.mjs";

export const modelConnection = {
  configured: Boolean(process.env.GEMINI_API_KEY),
  generate: createGeminiGenerator({
    apiKey: process.env.GEMINI_API_KEY,
    ...(process.env.CONTEXT_MODEL ? { model: process.env.CONTEXT_MODEL } : {}),
  }),
};
