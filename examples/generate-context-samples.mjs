import { readFile, writeFile, mkdir } from "node:fs/promises";
import { prepareSpeech } from "../demo/speech-pipeline.mjs";
import { createGeminiGenerator } from "../demo/adapters/gemini.mjs";
import { buildRequest, generateAudio, DEFAULT_VOICE } from "../demo/provider.mjs";

const examples = JSON.parse(await readFile(new URL("./context-examples.json", import.meta.url), "utf8"));
const directory = new URL("./audio/", import.meta.url);
await mkdir(directory, { recursive: true });
const manifest = [];
for (const example of examples) {
  const resolution = await prepareSpeech(example, { generate:createGeminiGenerator({ apiKey: process.env.GEMINI_API_KEY, ...(process.env.CONTEXT_MODEL ? { model: process.env.CONTEXT_MODEL } : {}) }) });
  const input = { text: resolution.speech.sourceText, cue: resolution.cue, voiceId: DEFAULT_VOICE, model: "eleven_v4" };
  const bytes = await generateAudio(input, { apiKey: process.env.ELEVENLABS_API_KEY });
  await writeFile(new URL(`${example.id}.mp3`, directory), bytes);
  manifest.push({ id: example.id, file: `${example.id}.mp3`, input: example, resolution, speech: buildRequest(input), generatedAt: new Date().toISOString() });
  await writeFile(new URL("context-manifest.json", directory), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Generated ${example.id}: ${JSON.stringify(resolution.cue)}; ${bytes.length} audio bytes`);
}
