# ElevenLabs Delivery Renderer

How does a situation become `[a tone]`?

```text
situation + transcript + speaker metadata
                   ↓
            context model
                   ↓
     { tone, reaction, explanation }
                   ↓
           deterministic renderer
                   ↓
       [tone] [reaction] your line
                   ↓
             ElevenLabs audio
```

The useful part is choosing delivery from what is happening, not typing
`[happy]` before a sentence. This repository lets you inspect and change
every input in that process.

**[Open the interactive prompt explorer →](https://mmf-code.github.io/elevenlabs-delivery-renderer/)**

## Same line, different contexts

> I understand. Let me check that for you.

These three cues were selected by **real Gemini calls**, then rendered and
sent to Eleven v4. The spoken line, voice, and speech model stay the same.

| Context supplied to the model | Actual model-selected cue | Actual audio |
| --- | --- | --- |
| A traveler worries their hotel reservation was lost. | `Calm and reassuring` | [▶ Listen](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/context-reassurance.mp3) |
| A tired colleague is interrupted again about an answer already sent. | `Strained patience` + `exhales` | [▶ Listen](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/context-irritation.mp3) |
| A new employee faces an unfamiliar technical question. | `Hesitant yet cooperative` + `exhales` | [▶ Listen](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/context-uncertainty.mp3) |

The inputs contain situations, transcripts, and metadata, **no preset cues**.
[Inspect every input, exact prompt, model result, and speech request](examples/audio/context-manifest.json).

These are recorded single generations, not fixed expected answers or an
audio-quality benchmark. Fresh model calls may choose other valid cues.

## Change it yourself

In the playground, try keeping the line constant while changing:

```json
{
  "text": "I understand. Let me check that for you.",
  "situation": "A receptionist is helping a worried traveler.",
  "transcript": "Guest: Please tell me I still have a room.\nReceptionist: May I see your booking number?",
  "metadata": {
    "speaker": "hotel receptionist",
    "goal": "reassure the guest while checking facts",
    "relationship": "professional",
    "urgency": "low"
  }
}
```

Now change the speaker to a tired colleague, the relationship to peers,
the transcript to repeated interruptions, or the goal to keeping a boundary.
The input and prompt update immediately. In live mode, the context model
reads the new inputs and returns a fresh delivery interpretation.

There is no keyword-to-tone table, situation ID lookup, or scripted fallback.
Metadata can contain your own JSON fields; the complete object enters the
model input. The public instruction is in [src/context.ts](src/context.ts).

### What updates?

| Edit | Result |
| --- | --- |
| Situation, transcript, metadata, or spoken line | Prompt updates immediately. Previous cue and audio are invalidated. |
| Click **Infer delivery** | Local server sends the current inputs to Gemini. |
| Enable **Infer after edits** | Edits trigger inference after a 1.2-second debounce. |
| Model response | Validated tone/reaction appear with a brief explanation and the exact speech request. |
| Voice, speech model, or previous spoken text | ElevenLabs request updates; context cue remains available. |
| Click **Generate audio** | ElevenLabs receives the current resolved cue and line. |

Late responses for old inputs cannot become the current cue or playback.
The application does not silently reuse an old cue after you edit context.

## Run the live playground

```sh
git clone https://github.com/mmf-code/elevenlabs-delivery-renderer.git
cd elevenlabs-delivery-renderer
npm ci
npm run demo
```

Open **http://127.0.0.1:4317**. Set `GEMINI_API_KEY` and
`ELEVENLABS_API_KEY` in the server environment for fresh inference and
speech. `CONTEXT_MODEL` defaults to `gemini-3.5-flash-lite` and is configurable.
See [.env.example](.env.example) for variable names; the demo does not
automatically load that file.

Both keys stay on the server. Inputs sent to Gemini include the situation,
transcript, speaker metadata, and line. ElevenLabs receives the rendered line,
voice/model, and optional previous spoken text. Use synthetic or consented
data. Inference and speech consume provider quota; auto-inference is opt-in.

**Hosted vs local:** the GitHub Pages explorer updates the exact public prompt
as you type and lets you inspect explicitly labeled recorded model results
only for their matching inputs. It has no inference backend and accepts no
API keys. Run locally for fresh inference and new audio. Editing a recorded
example clears its recorded result; it does not manufacture a new answer.

## A minimal context call

From the built checkout:

```js
import { inferDelivery } from "./demo/context-provider.mjs";
import { renderSpeech } from "./dist/index.js";

const result = await inferDelivery({
  text: "I understand. Let me check that for you.",
  situation: "A traveler is worried their reservation was lost.",
  transcript: "Guest: Please tell me I still have a room.",
  metadata: { speaker: "receptionist", goal: "reassure while checking facts" },
}, { apiKey: process.env.GEMINI_API_KEY });

const speech = renderSpeech(
  "I understand. Let me check that for you.",
  result.cue,
);
// sourceText: exact original words
// speechText: model-selected audio tags + original words
```

The inference adapter uses [Gemini structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
The model returns a short tone, an optional reaction, and a brief explanation.
Invalid output or provider failure is an error, not a preset voice direction.

The model chooses **delivery only**. It does not generate or rewrite dialogue.
The transcript supplied as context is preserved as input data. The previewed
public instruction and JSON input are exactly what the adapter sends.

## The renderer stays small

The core library is deterministic and has zero runtime dependencies. It runs
in modern browsers, Node.js, and Workers. The Gemini network adapter and
local server are separate demo modules.

```ts
import { renderSpeech, renderSegments, createSpeechStream } from "elevenlabs-delivery-renderer";

// Explicit cue, if your application already knows the delivery:
renderSpeech("Hello!", { tone: "warm" });
// { sourceText: "Hello!", speechText: "[warm] Hello!" }

// Caller-defined changes within a line:
renderSegments([
  { text: "Let me check. ", cue: { tone: "thoughtful" } },
  { text: "It is ready!", cue: { tone: "cheerful" } },
]);
// speechText: "[thoughtful] Let me check. [cheerful] It is ready!"

// Prefix only the first nonempty chunk:
const stream = createSpeechStream({ tone: "warm" });
stream.push("Hello");   // "[warm] Hello"
stream.push(", world"); // ", world"
```

The caller supplies all spaces and segment boundaries. The streaming helper
does not buffer or open a network connection.

The package is not yet on npm. Build this checkout, then install it from
another project with `npm install /absolute/path/to/elevenlabs-delivery-renderer`.

## Where the sound comes from

| Input | Role |
| --- | --- |
| Situation, transcript, and metadata | Evidence for the context model's delivery choice. |
| Public inference instruction | Asks for audible delivery metadata rather than new dialogue. |
| Inferred tone and reaction | Rendered into `[]` tags without rewriting the line. |
| Words, voice ID, speech model | Determine the actual synthesis along with the tags. |
| Previous spoken text | Optional ElevenLabs continuity field, up to 100 characters in the demo. |

The demo uses [ElevenLabs Text to Dialogue](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert)
with v4 or v3. Tags express intent; they do not guarantee a specific performance.
See the provider's [audio-tag guidance](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech).

## Tests and evidence

```sh
npm test
npm run site
npm run samples:context
```

Tests cover independent prompt changes for situation/transcript/metadata,
exact preview-to-request agreement, arbitrary model-returned cues, source
preservation, invalid outputs, provider errors without fallback, and rejection
of stale results after edits. Provider tests use mocks; the context audio
manifest separately records actual Gemini and ElevenLabs calls.

`npm run samples:context` performs real inference and speech generation for
the three synthetic cases, consumes quota, and overwrites their recordings.
The original [manual-cue examples](examples/audio/manifest.json) and
[same-sentence cue comparisons](examples/audio/comparisons-manifest.json)
remain available as lower-level renderer examples.

## Limits and license

Cue syntax is bounded and validated: tones allow letters, combining marks,
spaces, commas, hyphens, and apostrophes, up to 64 UTF-16 code units and eight
space/comma-separated words. Reactions are `sighs`, `laughs`, or `exhales`.
Existing tags in source text pass through; this is not a speech-text sanitizer.

The public inference instruction is a small standalone demo prompt, not a
behavioral simulation or assessment engine. No character policies, scoring,
private voice assets, or proprietary simulation prompts are included.

Code: [MIT](LICENSE). Audio generated with [ElevenLabs](https://elevenlabs.io);
see [sample attribution](examples/audio/README.md). Independent project.
Software licensing grants no provider service access or voice rights.
