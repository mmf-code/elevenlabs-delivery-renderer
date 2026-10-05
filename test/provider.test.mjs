import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRequest, generateAudio } from "../demo/provider.mjs";

test("provider request excludes context notes and unknown metadata", () => {
  const { body } = buildRequest({ text: "Hello", cue: { tone: "warm" }, previousText: "Come in.", context: "private local note", metadata: { arbitrary: true } });
  assert.deepEqual(body, { inputs: [{ text: "[warm] Hello", voice_id: "JBFqnCBsd6RMkjVDRZzb" }], model_id: "eleven_v4", previous_text: "Come in." });
});
test("provider boundary rejects invalid text, voice, model, and context length", () => {
  for (const input of [{ text: "" }, { text: "a".repeat(2001) }, { text: "Hi", voiceId: "../voices" }, { text: "Hi", model: "unknown" }, { text: "Hi", previousText: "a".repeat(101) }]) {
    assert.throws(() => buildRequest(input));
  }
});
test("audio adapter uses server credentials and sends only the previewed request", async () => {
  const audio = await generateAudio({ text: "Hello" }, { apiKey: "synthetic-test-key", request: async (url, options) => {
    assert.ok(url.startsWith("https://api.elevenlabs.io/v1/text-to-dialogue?"));
    assert.equal(options.headers["xi-api-key"], "synthetic-test-key");
    assert.equal(JSON.parse(options.body).inputs[0].text, "Hello");
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/mpeg" } });
  } });
  assert.deepEqual([...audio], [1, 2, 3]);
});
test("provider errors do not forward provider response bodies", async () => {
  await assert.rejects(generateAudio({ text: "Hi" }), /Set ELEVENLABS_API_KEY/);
  await assert.rejects(generateAudio({ text: "Hi" }, { apiKey: "synthetic-test-key", request: async () => new Response("sensitive provider body", { status: 403 }) }), /HTTP 403/);
});

test("provider preserves interior delivery tags and rejects text-segment disagreement", () => {
  const segments = [{text:"Let me check. ",cue:{tone:"uncertain"}},{text:"Yes, it is supported.",cue:{tone:"confident",reaction:"clears throat"}}];
  const text = segments.map((s) => s.text).join("");
  assert.equal(buildRequest({text,segments}).body.inputs[0].text,"[uncertain] Let me check. [confident] [clears throat] Yes, it is supported.");
  assert.throws(() => buildRequest({text:"Different words",segments}),/do not match/);
});
