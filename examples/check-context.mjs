import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

// A controlled live check: identical words, different conversations, no input cues.
// Start npm run demo with your model connected first. This uses two model calls.
const origin = `http://127.0.0.1:${Number(process.env.PORT ?? 4317)}`;
const text = "I saw your message. We need to talk about what happened. I know this has been a difficult week. Let us work out what to do next.";
const cases = [
  { situation:"A manager speaks privately to a colleague after the same missed deadline happened for the third time. The manager has just learned the colleague is caring for a sick parent and needs to discuss both responsibility and support.", transcript:"Colleague: I missed it again. I know. My father was taken back into hospital last night and I did not know how to tell you." },
  { situation:"A manager speaks to a colleague who helped resolve a serious customer incident. The customer is safe and the fix is confirmed. The colleague is exhausted and still worried about how close the team came to failure.", transcript:"Colleague: It is fixed. The customer confirmed everything is safe, but I cannot stop thinking about what might have happened." },
];
const results = [];
for (const context of cases) {
  const input = { ...context,text };
  const response = await fetch(`${origin}/api/context`,{ method:"POST",headers:{ "Content-Type":"application/json",Origin:origin },body:JSON.stringify(input) });
  const result = await response.json();
  assert.equal(response.ok,true,result.error);
  assert.equal(result.speech.sourceText,text);
  assert.equal(result.segments.map((s) => s.text).join(""),text);
  assert.equal(result.pipelineVersion,"joint-segments-v1");
  assert.ok(result.segments.slice(1).some((s) => Object.keys(s.cue).length),"Expected a contextual interior direction in this developed reply.");
  results.push({ input,result });
}
assert.notEqual(results[0].result.speech.speechText,results[1].result.speech.speechText);
await writeFile(new URL("./context-check.json",import.meta.url),JSON.stringify({ generatedAt:new Date().toISOString(),modelCalls:2,results },null,2)+"\n");
console.log("Live context check passed: same words preserved; different directions and interior boundaries from two real model calls.");
