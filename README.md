# ElevenLabs Delivery Renderer

A small TypeScript library that turns **explicit delivery cues** into
ElevenLabs audio tags. Keep the original words for your UI and records; send
the rendered version to the speech provider.

Zero runtime dependencies. Works in modern browsers, Node.js, and Workers.
Includes a local playground and real Eleven v4 audio examples.

## Try the playground

```sh
git clone https://github.com/mmf-code/elevenlabs-delivery-renderer.git
cd elevenlabs-delivery-renderer
npm ci
npm run demo
```

Open **http://127.0.0.1:4317**. Recorded examples and request previews work
without credentials. To generate new audio, set `ELEVENLABS_API_KEY` in your
server environment before starting the demo. Use a secrets manager or your
shell's secure input facility; do not put the key in frontend code or commit it.

The demo listens on loopback only and is intended for local development.
It is not a hosted multi-user service. Generation uses your ElevenLabs credits.

### What the context controls do

| Control | Behavior |
| --- | --- |
| Example situation | Loads a synthetic text and an editable delivery preset. |
| Situation notes | Local notes for a human choosing the delivery; never sent to ElevenLabs. |
| Voice direction | A short, explicit direction rendered as an audio tag. |
| Vocal reaction | Optional `sighs`, `laughs`, or `exhales` tag. |
| Previous spoken text | Sent as `previous_text` for continuity, up to 100 characters. |
| Voice ID and model | Select the voice you are permitted to use and Eleven v4 or v3. |

Editing situation notes does **not** automatically infer emotion or change
the delivery. Supply the cues yourself, or connect your own application logic.
There are no inference prompts, LLM calls, or hidden context-to-emotion rules.

## Listen to the examples

| Situation | Explicit direction | Audio |
| --- | --- | --- |
| Welcoming a visitor | `warm, friendly` | [Listen](examples/audio/welcome.mp3) |
| Explaining a delivery delay | `calm, apologetic` | [Listen](examples/audio/delay.mp3) |
| Sharing good news | `relieved, cheerful` + `exhales` | [Listen](examples/audio/discovery.mp3) |

The playground provides audio players. GitHub links open or download the MP3s.
[The manifest](examples/audio/manifest.json) records the exact synthetic text,
rendered input, model, public voice ID, and generation timestamp. These are
provider-generated examples, not an audio-quality benchmark or an A/B study.
Audio generated with [ElevenLabs](https://elevenlabs.io).

## Use the library

This repository is not yet published on npm. Build it locally or install it
from a local checkout:

```sh
npm run build
# From your consuming project, after building this checkout:
npm install /absolute/path/to/elevenlabs-delivery-renderer
```

```ts
import { renderSpeech } from "elevenlabs-delivery-renderer";

const result = renderSpeech("Hello, welcome!", { tone: "warm, friendly" });

result.sourceText; // "Hello, welcome!"
result.speechText; // "[warm, friendly] Hello, welcome!"
```

### Change delivery at explicit boundaries

```ts
import { renderSegments } from "elevenlabs-delivery-renderer";

const result = renderSegments([
  { text: "Let me check. ", cue: { tone: "thoughtful" } },
  { text: "It is ready!", cue: { tone: "cheerful" } },
]);
// sourceText: "Let me check. It is ready!"
// speechText: "[thoughtful] Let me check. [cheerful] It is ready!"
```

You choose the boundaries. Include spaces and punctuation in the text;
the renderer inserts no separators between segments.

### Render chunks

```ts
import { createSpeechStream } from "elevenlabs-delivery-renderer";

const stream = createSpeechStream({ tone: "warm" });
stream.push("");        // ""
stream.push("Hello");   // "[warm] Hello"
stream.push(", world"); // ", world"
```

Create a new instance for each utterance. The cue is captured at creation.
The helper prefixes only the first nonempty chunk and immediately forwards
the rest. It opens no socket and performs no network requests. Your transport
must support incremental text; the included playground uses a complete-text
HTTP request.

## ElevenLabs integration

The included adapter uses the [Text to Dialogue API](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert).
For example, the server sends this body:

```json
{
  "inputs": [{ "text": "[warm, friendly] Hello, welcome!", "voice_id": "JBFqnCBsd6RMkjVDRZzb" }],
  "model_id": "eleven_v4"
}
```

The key is supplied only in the server's `xi-api-key` header.
[ElevenLabs documents audio tags](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)
for v4, v4 Turbo, and v3. The renderer produces tag strings; availability,
supported endpoints, delivery quality, and costs depend on the model and account.
The demo supports v4 and v3 and never silently falls back to another model.

## Validation and limits

- `sanitizeCue(unknown)` omits invalid fields independently and ignores unknown fields.
- Tones accept letters, combining marks, spaces, commas, hyphens, and apostrophes;
  maximum 64 UTF-16 code units and eight space/comma-separated words.
- Brackets, newlines, and other tag syntax are rejected in cue metadata.
- Source text passes through exactly, including any brackets already present.
  This is not a speech-text sanitizer; existing tags in source text may affect delivery.
- Tags are instructions to a generative model. A valid tag does not guarantee an
  exact performance or prevent a model from producing an unexpected effect.
- No automatic emotion selection, intensity mapping, anchor matching, word emphasis,
  prompt templates, or conversation-state management is included.

## Development

```sh
npm test
npm run example
npm pack --dry-run
```

`npm run samples` regenerates the three recorded examples using the server's
`ELEVENLABS_API_KEY`. It incurs provider usage and overwrites their MP3s and manifest.
The library's npm package includes only the built library, README, and license;
the playground and audio examples live in the GitHub repository.

See [PLAN.md](PLAN.md) for the release boundary. CI builds and tests on Node 22 and 24.

## License

Library and demo code: [MIT](LICENSE). See [audio attribution](examples/audio/README.md)
for generated samples. This is an independent project, unaffiliated with ElevenLabs.
The code license grants no ElevenLabs service access or voice rights;
API usage remains subject to [ElevenLabs terms](https://elevenlabs.io/elevenapi-terms).
