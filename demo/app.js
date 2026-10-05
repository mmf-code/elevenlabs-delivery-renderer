import { buildTurnRequest } from "./speech-pipeline.mjs";
import { createRevisionGate } from "./revision.mjs";

const $ = (id) => document.getElementById(id);
const hosted = document.documentElement.dataset.backend === "static";
const examples = await fetch("./context-examples.json").then((res) => res.json());
const recordings = await fetch("./context-manifest.json").then((res) => res.ok ? res.json() : []).catch(() => []);
const config = hosted ? { contextConfigured:false, speechConfigured:false } : await fetch("./api/config").then((res) => res.json());
const gate = createRevisionGate();
let running = false, speechRunning = false, timer, audioUrl;
$("mode").textContent = hosted
  ? "Try the recorded examples here. Run the local demo with your own model to create new replies and audio."
  : "Your model creates the reply and voice direction in one generation.";
$("auto").disabled = !config.contextConfigured;
function input() { return { text:$("text").value, situation:$("context").value, transcript:$("transcript").value }; }
function currentRecording() {
  try { const prompt = buildTurnRequest(input()); return recordings.find((record) => JSON.stringify(record.resolution.prompt.input) === JSON.stringify(prompt.input)); }
  catch { return undefined; }
}
function controls() {
  $("infer").disabled = running || !config.contextConfigured;
  $("generate").disabled = !gate.value() || speechRunning || !config.speechConfigured;
  $("recorded").disabled = !currentRecording();
}
function hideAudio() {
  $("player").pause(); $("player").removeAttribute("src"); $("player").hidden = true; $("download").hidden = true;
  if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = undefined; }
}
function speechInput(result) {
  return { text:result.speech.sourceText, cue:result.cue, voiceId:$("voice").value, model:$("model").value, previousText:$("previous").value };
}
function preview() {
  try { const prompt = buildTurnRequest(input()); $("prompt").textContent = prompt.instruction + "\n\nINPUT\n" + prompt.userText; }
  catch (error) { $("prompt").textContent = error.message; }
  const result = gate.value();
  $("source").textContent = result?.speech.sourceText ?? "The generated reply appears here.";
  $("tagged").textContent = result?.speech.speechText ?? "The line with automatically assigned voice tags appears here.";
  $("resolution").textContent = result ? JSON.stringify({ delivery:result.cue, provenance:result.provenance },null,2) : "Created automatically with the reply.";
  if (result) {
    const value = speechInput(result);
    const body = { inputs:[{ text:result.speech.speechText, voice_id:value.voiceId }], model_id:value.model };
    if (value.previousText) body.previous_text = value.previousText;
    $("payload").textContent = JSON.stringify(body,null,2);
  } else { $("payload").textContent = "Waiting for a reply."; }
  controls();
}
function edited() {
  gate.invalidate(); clearTimeout(timer); hideAudio(); preview();
  $("status").textContent = "Ready to create a reply from this conversation.";
  if ($("auto").checked && !running) timer = setTimeout(infer,1200);
}
async function infer() {
  if (running || !config.contextConfigured) return;
  let value;
  try { value = input(); buildTurnRequest(value); } catch (error) { $("status").textContent = error.message; return; }
  const ticket = gate.ticket();
  running = true; controls(); $("status").textContent = "Creating reply and delivery…";
  try {
    const response = await fetch("./api/context",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Reply generation failed.");
    if (gate.accept(ticket,{ provenance:"fresh model generation",...result })) {
      hideAudio(); preview(); $("status").textContent = "Reply ready. Press Hear this reply.";
    }
  } catch (error) { if (ticket === gate.ticket()) $("status").textContent = error.message; }
  finally {
    running = false; controls();
    if (ticket !== gate.ticket() && $("auto").checked) { clearTimeout(timer); timer = setTimeout(infer,1200); }
  }
}
function selectExample() {
  const example = examples.find((item) => item.id === $("situation").value);
  $("context").value = example.situation; $("transcript").value = example.transcript;
  $("text").value = example.text ?? ""; $("previous").value = ""; edited();
}
for (const example of examples) {
  const option = document.createElement("option"); option.value = example.id; option.textContent = example.name; $("situation").append(option);
}
for (const record of recordings) {
  const card = document.createElement("div"); card.className = "sample";
  const title = document.createElement("strong"); title.textContent = record.input.name;
  const line = document.createElement("pre"); line.textContent = record.resolution.speech.speechText;
  const audio = document.createElement("audio"); audio.controls = true; audio.preload = "none"; audio.src = "./audio/" + record.file;
  card.append(title,line,audio); $("samples").append(card);
}
$("situation").addEventListener("change",selectExample);
for (const id of ["context","transcript","text"]) $(id).addEventListener("input",edited);
for (const id of ["previous","voice","model"]) $(id).addEventListener("input",() => { hideAudio(); preview(); });
$("auto").addEventListener("change",() => { clearTimeout(timer); if ($("auto").checked) timer = setTimeout(infer,1200); });
$("infer").addEventListener("click",() => { clearTimeout(timer); infer(); });
$("recorded").addEventListener("click",() => {
  const record = currentRecording(); if (!record) return;
  gate.invalidate(); clearTimeout(timer); gate.accept(gate.ticket(),{ provenance:"recorded model generation",...record.resolution });
  hideAudio(); preview(); $("status").textContent = "Recorded example loaded.";
});
$("generate").addEventListener("click",async () => {
  const result = gate.value(); if (!result || speechRunning) return;
  const value = speechInput(result), identity = JSON.stringify(value), ticket = gate.ticket();
  speechRunning = true; controls(); $("status").textContent = "Creating audio…";
  try {
    const response = await fetch("./api/speech",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error ?? "Speech generation failed."); }
    const blob = await response.blob(), latest = gate.value();
    if (ticket !== gate.ticket() || !latest || JSON.stringify(speechInput(latest)) !== identity) return;
    hideAudio(); audioUrl = URL.createObjectURL(blob); $("player").src = audioUrl; $("player").hidden = false;
    $("download").href = audioUrl; $("download").hidden = false; $("status").textContent = "Audio ready. Press play.";
  } catch (error) { if (ticket === gate.ticket()) $("status").textContent = error.message; }
  finally { speechRunning = false; controls(); }
});
selectExample();
