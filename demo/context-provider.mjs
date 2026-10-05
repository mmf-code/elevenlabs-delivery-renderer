import { buildContextPrompt, sanitizeCue } from "../dist/index.js";

export const DEFAULT_CONTEXT_MODEL = "gemini-3.5-flash-lite";
export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    tone: { type: "STRING" },
    reaction: { type: "STRING", enum: ["none", "sighs", "laughs", "exhales"] },
    explanation: { type: "STRING" },
  },
  required: ["tone", "reaction", "explanation"],
};

export function buildContextRequest(input, model = DEFAULT_CONTEXT_MODEL) {
  if (typeof model !== "string" || !/^gemini-[a-z0-9.-]{1,80}$/u.test(model)) {
    throw new Error("Invalid context model identifier.");
  }
  const prompt = buildContextPrompt(input);
  const body = {
    systemInstruction: { parts: [{ text: prompt.instruction }] },
    contents: [{ role: "user", parts: [{ text: prompt.userText }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  };
  return { model, prompt, body };
}

/** Real inference. There is no scripted fallback when a provider fails. */
export async function inferDelivery(input, { apiKey, model = DEFAULT_CONTEXT_MODEL, request = fetch } = {}) {
  if (!apiKey) throw new Error("Set GEMINI_API_KEY on the server for context inference.");
  const prepared = buildContextRequest(input, model);
  const response = await request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(prepared.body),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Context provider returned HTTP ${response.status}. No delivery was inferred.`);
  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason !== "STOP") throw new Error("Context inference did not complete. No delivery was inferred.");
  const text = candidate.content?.parts?.filter((part) => !part.thought && typeof part.text === "string").map((part) => part.text).join("");
  let output;
  try { output = JSON.parse(text); } catch { throw new Error("Context provider returned invalid JSON."); }
  if (!output || Array.isArray(output) || typeof output.explanation !== "string" || !output.explanation.trim() || output.explanation.length > 800) {
    throw new Error("Context provider returned invalid delivery metadata.");
  }
  if (!["none", "sighs", "laughs", "exhales"].includes(output.reaction)) {
    throw new Error("Context provider returned an invalid reaction.");
  }
  const cue = sanitizeCue({ tone: output.tone, reaction: output.reaction });
  if (!cue.tone || cue.tone !== output.tone.trim().replace(/ +/gu, " ")) {
    throw new Error("Context provider returned an invalid tone.");
  }
  return {
    cue,
    explanation: output.explanation,
    prompt: prepared.prompt,
    provider: "Gemini",
    model,
    usage: data.usageMetadata ? {
      inputTokens: data.usageMetadata.promptTokenCount ?? null,
      outputTokens: data.usageMetadata.candidatesTokenCount ?? null,
    } : null,
  };
}
