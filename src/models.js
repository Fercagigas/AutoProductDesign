/**
 * Configuración de 3 LLMs independientes via OpenRouter.
 * Cada modelo tiene su propia API key.
 */
import { ChatOpenAI } from "@langchain/openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function createLLM(apiKey, model, temperature = 0.7) {
  return new ChatOpenAI({
    model,
    temperature,
    apiKey,
    configuration: {
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
    },
    defaultHeaders: {
      "HTTP-Referer": "https://autoproductdesign.local",
      "X-Title": "AutoProductDesign",
    },
  });
}

/** nvidia/nemotron - Architect */
export function getNemotron(temperature = 0.7) {
  return createLLM(
    process.env.NEMOTRON_API_KEY,
    process.env.NEMOTRON_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free",
    temperature
  );
}

/** qwen/qwen3-235b - Orchestrator, PM, Synthesis, Scribe */
export function getQwen(temperature = 0.7) {
  return createLLM(
    process.env.QWEN_API_KEY,
    process.env.QWEN_MODEL || "qwen/qwen3-235b-a22b-thinking-2507",
    temperature
  );
}

/** openai/gpt-oss-20b - QA Lead */
export function getGptOss(temperature = 0.7) {
  return createLLM(
    process.env.GPT_OSS_API_KEY,
    process.env.GPT_OSS_MODEL || "openai/gpt-oss-20b:free",
    temperature
  );
}
