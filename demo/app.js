import { renderSpeech } from "/renderer.js";

const $ = (id) => document.getElementById(id);
const situations = await fetch("/situations.json").then((res) => res.json());
let audioUrl;
function input() {
  return { text: $("text").value, cue: { tone: $("tone").value, reaction: $("reaction").value }, previousText: $("previous").value, voiceId: $("voice").value, model: $("model").value };
}
function preview() {
  const value = input();
  const rendered = renderSpeech(value.text, value.cue);
  $("source").textContent = rendered.sourceText;
  const body = { inputs: [{ text: rendered.speechText, voice_id: value.voiceId }], model_id: value.model };
  if (value.previousText) body.previous_text = value.previousText;
  $("payload").textContent = JSON.stringify(body, null, 2);
}
function selectSituation() {
  const selected = situations.find((item) => item.id === $("situation").value);
  $("context").value = selected.context;
  $("text").value = selected.text;
  $("tone").value = selected.cue.tone;
  $("reaction").value = selected.cue.reaction ?? "";
  $("previous").value = "";
  preview();
}
for (const situation of situations) {
  const option = document.createElement("option");
  option.value = situation.id; option.textContent = situation.name;
  $("situation").append(option);
  const card = document.createElement("div"); card.className = "sample";
  const title = document.createElement("strong"); title.textContent = situation.name;
  const text = document.createElement("small"); text.textContent = situation.text;
  const audio = document.createElement("audio"); audio.controls = true; audio.preload = "none"; audio.src = `/audio/${situation.id}.mp3`;
  card.append(title, text, audio); $("samples").append(card);
}
$("situation").addEventListener("change", selectSituation);
$("preview").addEventListener("click", preview);
for (const id of ["text", "tone", "reaction", "previous", "voice", "model"]) $(id).addEventListener("input", preview);
$("generate").addEventListener("click", async () => {
  preview(); $("generate").disabled = true;
  $("status").textContent = "Generating speech…";
  try {
    const response = await fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input()) });
    if (!response.ok) {
      const data = await response.json(); throw new Error(data.error ?? "Generation failed.");
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(await response.blob());
    $("player").src = audioUrl; $("player").hidden = false;
    $("download").href = audioUrl; $("download").hidden = false;
    $("status").textContent = "Audio ready. Press play to listen.";
  } catch (error) { $("status").textContent = error.message; }
  finally { $("generate").disabled = false; }
});
selectSituation();
