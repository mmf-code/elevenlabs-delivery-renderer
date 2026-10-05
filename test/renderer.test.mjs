import assert from "node:assert/strict";
import { test } from "node:test";
import { createSpeechStream, renderSegments, renderSpeech, sanitizeCue } from "../dist/index.js";

test("keeps source text exact and renders explicit instructions", () => {
  const source = "  The package arrived.\nThank you!";
  assert.deepEqual(renderSpeech(source, { tone: " warm,  relieved ", reaction: "exhales" }), {
    sourceText: source,
    speechText: "[warm, relieved] [exhales] " + source,
  });
});

test("rejects malformed tags without losing valid sibling fields", () => {
  for (const tone of ["warm] [shouts", "hello\nworld", "<voice>", "x".repeat(65), "a b c d e f g h i", "", "123"]) {
    assert.deepEqual(sanitizeCue({ tone, reaction: "sighs" }), { reaction: "sighs" });
  }
  assert.deepEqual(sanitizeCue({ tone: "warm", reaction: "bad] [tag", secret: "ignored" }), { tone: "warm" });
  assert.deepEqual(sanitizeCue({ tone: "barely containing irritation", reaction: "clears throat" }), { tone:"barely containing irritation", reaction:"clears throat" });
  for (const input of [null, undefined, [], "warm", 42]) assert.deepEqual(sanitizeCue(input), {});
  assert.deepEqual(sanitizeCue(Object.defineProperty({}, "tone", { get() { throw new Error("bad getter"); } })), {});
});

test("accepts multilingual voice directions and combining marks", () => {
  for (const tone of ["sıcak", "curieux", "穏やか", "re\u0301serve\u0301"]) {
    assert.equal(renderSpeech("Hello", { tone }).speechText, `[${tone}] Hello`);
  }
});

test("segments preserve spacing, punctuation, and caller-selected boundaries", () => {
  assert.deepEqual(renderSegments([
    { text: "Let me check. ", cue: { tone: "thoughtful" } },
    { text: "It is ready!", cue: { tone: "cheerful" } },
  ]), {
    sourceText: "Let me check. It is ready!",
    speechText: "[thoughtful] Let me check. [cheerful] It is ready!",
  });
  assert.deepEqual(renderSegments([]), { sourceText: "", speechText: "" });
});

test("stream output equals whole-text output at every possible split", () => {
  const text = "Hello, world! 👋\nYour order is ready.";
  const cue = { tone: "warm", reaction: "laughs" };
  const expected = renderSpeech(text, cue).speechText;
  for (let at = 0; at <= text.length; at++) {
    const stream = createSpeechStream(cue);
    assert.equal(stream.push("") + stream.push(text.slice(0, at)) + stream.push("") + stream.push(text.slice(at)), expected);
  }
  const stream = createSpeechStream(cue);
  assert.equal([...text].map((chunk) => stream.push(chunk)).join(""), expected);
});

test("stream captures cues at creation and isolates utterances", () => {
  const cue = { tone: "warm" };
  const first = createSpeechStream(cue);
  cue.tone = "angry";
  assert.equal(first.push("Hello"), "[warm] Hello");
  assert.equal(first.push(" again"), " again");
  assert.equal(createSpeechStream(cue).push("Hello"), "[angry] Hello");
});

test("empty text emits no tags; uncued text passes through", () => {
  assert.deepEqual(renderSpeech("", { tone: "warm" }), { sourceText: "", speechText: "" });
  assert.equal(renderSpeech("[literal]  text\n").speechText, "[literal]  text\n");
  assert.equal(createSpeechStream().push("Hello"), "Hello");
  assert.throws(() => renderSpeech(null), TypeError);
  assert.throws(() => createSpeechStream().push(123), TypeError);
});
