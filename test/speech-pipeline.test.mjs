import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTurnRequest, prepareSpeech } from "../demo/speech-pipeline.mjs";

const input = { situation:"A customer needs help with a delayed order.", transcript:"Customer: This is the third time I have called." };

test("one model generation creates the spoken line and delivery together", async () => {
  let calls = 0;
  const result = await prepareSpeech(input, { generate:async (request) => {
    calls++;
    assert.equal(request.input.transcript,input.transcript);
    assert.equal(request.input.text,"");
    assert.ok(!Object.hasOwn(request.input,"metadata"));
    return { text:"I hear you. Let me look into this.", delivery:{ tone:"calm, attentive", reaction:"none" } };
  } });
  assert.equal(calls,1);
  assert.deepEqual(result.speech,{ sourceText:"I hear you. Let me look into this.", speechText:"[calm, attentive] I hear you. Let me look into this." });
});

test("conversation changes reach the model without asking the user for metadata", async () => {
  const updated = { ...input, transcript:"Customer: Thank you, that resolves it." };
  const first = buildTurnRequest(input), next = buildTurnRequest(updated);
  assert.notEqual(first.userText,next.userText);
  const result = await prepareSpeech(updated,{ generate:async () => ({ text:"Glad we could resolve it.",tone:"warm, relieved",reaction:"none" }) });
  assert.equal(result.speech.speechText,"[warm, relieved] Glad we could resolve it.");
});

test("manual metadata is rejected; empty optional line allows a generated reply", async () => {
  assert.equal(buildTurnRequest(input).input.text,"");
  for (const name of ["metadata","cue","delivery"]) assert.throws(() => buildTurnRequest({ ...input,[name]:{} }),/created by your model/);
  await assert.rejects(prepareSpeech(input),/Connect your model/);
});

test("a supplied line is preserved and model failures do not trigger more calls", async () => {
  const fixed = { ...input,text:"Let me check." };
  const result = await prepareSpeech(fixed,{ generate:async () => ({ text:fixed.text,tone:"thoughtful",reaction:"none" }) });
  assert.equal(result.speech.sourceText,fixed.text);
  await assert.rejects(prepareSpeech(fixed,{ generate:async () => ({ text:"Changed words",tone:"warm",reaction:"none" }) }),/changed/);
  let calls = 0;
  await assert.rejects(prepareSpeech(input,{ generate:async () => { calls++; throw new Error("Provider unavailable"); } }),/Provider unavailable/);
  assert.equal(calls,1);
});

test("invalid text and delivery are rejected before rendering", async () => {
  for (const output of [
    { text:"[angry] Hello",tone:"warm",reaction:"none" },
    { text:"Hello",tone:"warm] [shouts",reaction:"none" },
    { text:"Hello",tone:"warm",reaction:"bad] [tag" },
    { text:"",tone:"warm",reaction:"none" },
  ]) await assert.rejects(prepareSpeech(input,{ generate:async () => output }));
});

test("one generation places open vocabulary directions inside the reply without changing words", async () => {
  let calls = 0;
  const segments = [
    { text:"I know this is frustrating. ",tone:"softly acknowledging the worry",reaction:"none" },
    { text:"I found your booking, ",tone:"relieved",reaction:"exhales" },
    { text:"and your room is ready.",tone:"quietly confident",reaction:"none" },
  ];
  const text = segments.map((s) => s.text).join("");
  const result = await prepareSpeech({ ...input,text },{ generate:async () => { calls++; return { segments }; } });
  assert.equal(calls,1);
  assert.equal(result.speech.sourceText,text);
  assert.equal(result.speech.speechText,"[softly acknowledging the worry] I know this is frustrating. [relieved] [exhales] I found your booking, [quietly confident] and your room is ready.");
  assert.equal(result.segments.length,3);
});

test("invalid boundaries, extra tags, and overlong rendered speech are rejected", async () => {
  for (const segments of [[], [{ text:"Hi [shouts]",tone:"warm" }], Array.from({length:13},() => ({text:"Hi"})), [{text:"a".repeat(2000),tone:"warm"}], [{text:"con",tone:"warm"},{text:"versation",tone:"angry"}]]) {
    await assert.rejects(prepareSpeech(input,{ generate:async () => ({segments}) }));
  }
  await assert.rejects(prepareSpeech({ ...input,text:"Hello, world." },{ generate:async () => ({segments:[{text:"Hello,"},{text:"world."}]}) }),/changed/);
});
