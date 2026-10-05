import { renderSpeech } from "../dist/index.js";

export const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";

/** Only explicit text/cues and previous spoken text reach the provider. */
export function buildRequest(input) {
  if (!input || typeof input !== "object") throw new Error("A request object is required.");
  if (typeof input.text !== "string" || !input.text.trim() || input.text.length > 2000) {
    throw new Error("Enter between 1 and 2,000 characters of speech text.");
  }
  const voiceId = input.voiceId ?? DEFAULT_VOICE;
  if (typeof voiceId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/u.test(voiceId)) {
    throw new Error("Enter a valid voice ID.");
  }
  const model = input.model ?? "eleven_v4";
  if (!["eleven_v4", "eleven_v3"].includes(model)) throw new Error("Choose Eleven v4 or v3.");
  const previousText = input.previousText ?? "";
  if (typeof previousText !== "string" || previousText.length > 100) {
    throw new Error("Previous spoken text must be at most 100 characters.");
  }
  const rendered = renderSpeech(input.text, input.cue);
  const body = { inputs: [{ text: rendered.speechText, voice_id: voiceId }], model_id: model };
  if (previousText) body.previous_text = previousText;
  return { rendered, body };
}

export async function generateAudio(input, { apiKey, request = fetch } = {}) {
  if (!apiKey) throw new Error("Set ELEVENLABS_API_KEY on the server to generate audio.");
  const { body } = buildRequest(input);
  const response = await request("https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`ElevenLabs returned HTTP ${response.status}. Check your plan, model access, and voice permissions.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || !(response.headers.get("content-type") ?? "").startsWith("audio/")) {
    throw new Error("ElevenLabs did not return an audio file.");
  }
  return bytes;
}
