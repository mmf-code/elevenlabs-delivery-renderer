import { createSpeechStream, renderSegments } from "../dist/index.js";

const rendered = renderSegments([
  { text: "Let me check the delivery date. ", cue: { tone: "thoughtful" } },
  { text: "It arrives tomorrow!", cue: { tone: "cheerful" } },
]);
console.log(JSON.stringify(rendered, null, 2));

const stream = createSpeechStream({ tone: "warm" });
console.log(["Hello", ", ", "welcome!"].map((chunk) => stream.push(chunk)).join(""));
