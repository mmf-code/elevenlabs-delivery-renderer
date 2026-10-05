import { readFile, writeFile, mkdir } from "node:fs/promises";
import { generateAudio, buildRequest, DEFAULT_VOICE } from "../demo/provider.mjs";

const comparisonOnly = process.argv.includes("--comparisons");
const inputFile = comparisonOnly ? "comparisons.json" : "situations.json";
const situations = JSON.parse(await readFile(new URL(`./${inputFile}`, import.meta.url), "utf8"));
const directory = new URL("./audio/", import.meta.url);
await mkdir(directory, { recursive: true });
const manifest = [];
for (const situation of situations) {
  const input = { text: situation.text, cue: situation.cue, voiceId: DEFAULT_VOICE, model: "eleven_v4" };
  const bytes = await generateAudio(input, { apiKey: process.env.ELEVENLABS_API_KEY });
  await writeFile(new URL(`${situation.id}.mp3`, directory), bytes);
  manifest.push({ id: situation.id, file: `${situation.id}.mp3`, context: situation.context, ...buildRequest(input), generatedAt: new Date().toISOString(), provider: "ElevenLabs" });
  console.log(`Generated ${situation.id}: ${bytes.length} bytes`);
}
const manifestFile = comparisonOnly ? "comparisons-manifest.json" : "manifest.json";
await writeFile(new URL(manifestFile, directory), JSON.stringify(manifest, null, 2) + "\n");
