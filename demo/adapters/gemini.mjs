import { DEFAULT_CONTEXT_MODEL } from "../context-provider.mjs";

/** Optional demo adapter. The renderer and pipeline accept any model callback. */
export function createGeminiGenerator({ apiKey, model = DEFAULT_CONTEXT_MODEL, request = fetch } = {}) {
  return async (prompt) => {
    if (!apiKey) throw new Error("Configure a server-side model key to generate a reply.");
    if (!/^gemini-[a-z0-9.-]{1,80}$/u.test(model)) throw new Error("Invalid model identifier.");
    const response = await request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method:"POST",
      headers:{ "x-goog-api-key":apiKey, "Content-Type":"application/json" },
      body:JSON.stringify({
        systemInstruction:{ parts:[{ text:prompt.instruction }] },
        contents:[{ role:"user", parts:[{ text:prompt.userText }] }],
        generationConfig:{ responseMimeType:"application/json", responseSchema:prompt.schema },
      }),
      signal:AbortSignal.timeout(45000),
    });
    if (!response.ok) throw new Error(`The model provider returned HTTP ${response.status}.`);
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason !== "STOP") throw new Error("The model did not complete the reply.");
    const text = candidate.content?.parts?.filter((part) => !part.thought && typeof part.text === "string").map((part) => part.text).join("");
    try { return JSON.parse(text); } catch { throw new Error("The model returned invalid JSON."); }
  };
}
