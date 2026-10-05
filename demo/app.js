import { renderSpeech, buildContextPrompt } from "./renderer.js";
import { createRevisionGate } from "./revision.mjs";

const $ = (id) => document.getElementById(id);
const hosted = document.documentElement.dataset.backend === "static";
const examples = await fetch("./context-examples.json").then((res) => res.json());
const recordings = await fetch("./context-manifest.json").then((res) => res.ok ? res.json() : []).catch(() => []);
const config = hosted ? { contextConfigured:false, speechConfigured:false } : await fetch("./api/config").then((res) => res.json());
const gate = createRevisionGate();
let running = false;
let timer;
let audioUrl;
let speechRunning = false;

$("mode").textContent = hosted
  ? "Hosted prompt explorer: inputs update the real public prompt immediately. Recorded results are labeled. Run npm run demo locally with server-side Gemini and ElevenLabs keys for fresh inference and speech."
  : `Local live pipeline. Context model: ${config.contextModel}. Inference ${config.contextConfigured ? "ready" : "needs GEMINI_API_KEY"}; speech ${config.speechConfigured ? "ready" : "needs ELEVENLABS_API_KEY"}.`;
$("auto").disabled = !config.contextConfigured;
function input() {
  return { text:$("text").value, situation:$("context").value, transcript:$("transcript").value, metadata:JSON.parse($("metadata").value) };
}
function currentRecording() {
  try {
    const prompt = buildContextPrompt(input());
    return recordings.find((record) => JSON.stringify(record.resolution.prompt.input) === JSON.stringify(prompt.input));
  } catch { return undefined; }
}
function controls() {
  $("infer").disabled = running || !config.contextConfigured;
  $("generate").disabled = !gate.value() || speechRunning || !config.speechConfigured;
  $("recorded").disabled = !currentRecording();
}
function hideAudio() {
  $("player").pause(); $("player").removeAttribute("src"); $("player").hidden = true;
  $("download").hidden = true;
  if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = undefined; }
}
function preview() {
  $("source").textContent = $("text").value;
  try {
    const prompt = buildContextPrompt(input());
    $("prompt").textContent = prompt.instruction + "\n\nUSER INPUT\n" + prompt.userText;
  } catch (error) { $("prompt").textContent = error.message; }
  const result = gate.value();
  $("resolution").textContent = result ? JSON.stringify(result, null, 2) : "No current result. Infer delivery or load an explicitly recorded example.";
  if (result) {
    const text = renderSpeech($("text").value, result.cue).speechText;
    const body = { inputs:[{ text, voice_id:$("voice").value }], model_id:$("model").value };
    if ($("previous").value) body.previous_text = $("previous").value;
    $("payload").textContent = JSON.stringify(body, null, 2);
  } else { $("payload").textContent = "Waiting for current delivery metadata. No old cue is reused."; }
  controls();
}
function edited() {
  gate.invalidate(); clearTimeout(timer); hideAudio(); preview();
  $("status").textContent = "Input changed. Prompt updated; previous delivery is invalid.";
  if ($("auto").checked && !running) timer = setTimeout(infer, 1200);
}
async function infer() {
  if (running || !config.contextConfigured) return;
  let value;
  try { value = input(); buildContextPrompt(value); } catch (error) { $("status").textContent = error.message; return; }
  const ticket = gate.ticket();
  running = true; controls(); $("status").textContent = "Inferring delivery from the current context…";
  try {
    const response = await fetch("./api/context", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(value) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Inference failed.");
    if (gate.accept(ticket, { provenance:"live inference", ...result })) {
      hideAudio(); preview(); $("status").textContent = "Fresh model-selected delivery ready. Generate audio to hear it.";
    }
  } catch (error) { if (ticket === gate.ticket()) $("status").textContent = error.message; }
  finally {
    running = false; controls();
    if (ticket !== gate.ticket() && $("auto").checked) { clearTimeout(timer); timer = setTimeout(infer, 1200); }
  }
}
function selectExample() {
  const example = examples.find((item) => item.id === $("situation").value);
  $("context").value = example.situation;
  $("transcript").value = example.transcript;
  $("metadata").value = JSON.stringify(example.metadata, null, 2);
  $("text").value = example.text; $("previous").value = "";
  edited();
}
for (const example of examples) {
  const option = document.createElement("option"); option.value = example.id; option.textContent = example.name; $("situation").append(option);
}
for (const record of recordings) {
  const card = document.createElement("div"); card.className = "sample";
  const title = document.createElement("strong"); title.textContent = record.input.name;
  const context = document.createElement("small"); context.textContent = record.input.situation;
  const metadata = document.createElement("pre"); metadata.textContent = JSON.stringify({ cue:record.resolution.cue, explanation:record.resolution.explanation }, null, 2);
  const audio = document.createElement("audio"); audio.controls = true; audio.preload = "none"; audio.src = "./audio/" + record.file;
  card.append(title, context, metadata, audio); $("samples").append(card);
}
$("situation").addEventListener("change", selectExample);
for (const id of ["context","transcript","metadata","text"]) $(id).addEventListener("input", edited);
for (const id of ["previous","voice","model"]) $(id).addEventListener("input", () => { hideAudio(); preview(); });
$("auto").addEventListener("change", () => { clearTimeout(timer); if ($("auto").checked) timer = setTimeout(infer, 1200); });
$("infer").addEventListener("click", () => { clearTimeout(timer); infer(); });
$("recorded").addEventListener("click", () => {
  const record = currentRecording(); if (!record) return;
  gate.invalidate(); clearTimeout(timer);
  gate.accept(gate.ticket(), { provenance:"recorded model output — not fresh inference", ...record.resolution });
  hideAudio(); preview(); $("status").textContent = "Recorded result loaded for the exact matching inputs.";
});
$("generate").addEventListener("click", async () => {
  const result = gate.value(); if (!result || speechRunning) return;
  const value = { text:$("text").value, cue:result.cue, voiceId:$("voice").value, model:$("model").value, previousText:$("previous").value };
  const identity = JSON.stringify(value);
  const ticket = gate.ticket();
  speechRunning = true; controls(); $("status").textContent = "Generating speech from the current resolved cue…";
  try {
    const response = await fetch("./api/speech", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(value) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error ?? "Speech generation failed."); }
    const blob = await response.blob();
    const latest = gate.value();
    const now = latest ? JSON.stringify({ text:$("text").value, cue:latest.cue, voiceId:$("voice").value, model:$("model").value, previousText:$("previous").value }) : "";
    if (ticket !== gate.ticket() || now !== identity) return;
    hideAudio(); audioUrl = URL.createObjectURL(blob); $("player").src = audioUrl; $("player").hidden = false;
    $("download").href = audioUrl; $("download").hidden = false; $("status").textContent = "Current audio ready. Press play.";
  } catch (error) { if (ticket === gate.ticket()) $("status").textContent = error.message; }
  finally { speechRunning = false; controls(); }
});
selectExample();
