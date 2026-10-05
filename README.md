# ElevenLabs Delivery Renderer

Same words. Different delivery.

```ts
renderSpeech("I understand.", { tone: "warm, reassuring" });
// sourceText: "I understand."
// speechText: "[warm, reassuring] I understand."
```

A small, deterministic TypeScript renderer for caller-selected ElevenLabs
audio tags. Zero runtime dependencies. No model calls in the library.

**[Listen to all seven examples →](https://mmf-code.github.io/elevenlabs-delivery-renderer/)**

## Hear the idea

The sentence below stays the same. The caller selects a different cue.
All four clips use the same public voice and Eleven v4 model.

> I understand. Let me check that for you.

| Situation | Cue supplied by the caller | Actual audio |
| --- | --- | --- |
| No explicit direction | `{}` | [▶ No cue](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/same-neutral.mp3) |
| Reassuring a customer | `{ tone: "warm, reassuring" }` | [▶ Warm](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/same-warm.mp3) |
| Responding with confidence | `{ tone: "firm, composed" }` | [▶ Firm](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/same-firm.mp3) |
| Thinking before answering | `{ tone: "hesitant, thoughtful" }` | [▶ Hesitant](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/same-hesitant.mp3) |

These are real, single-generation examples with synthetic text. They show
what the provider produced, not a guaranteed performance or quality ranking.
The listening page has audio players; the links above open or download MP3s.

## What determines the sound?

```text
your application                      this library             ElevenLabs
text + explicit delivery cue ──────→ tagged speech text ──────→ audio
             │
             └────────────────────→ original text for UI / storage
```

The renderer translates a decision already made by the caller. It does not
read a conversation and decide how a speaker feels.

| Input | Who supplies it? | What it affects |
| --- | --- | --- |
| Words | Your application | Spoken content and natural prosody. |
| Tone and reaction | Your application or a person | Explicit voice directions rendered as tags. |
| Segment boundaries | Your application | Where a new delivery direction begins. |
| Voice ID | Your ElevenLabs request | The chosen voice. |
| Model | Your ElevenLabs request | Synthesis behavior and supported capabilities. |
| Previous spoken text | Optional provider request field | Continuity with preceding dialogue. |
| Situation notes | A person using the playground | Local notes to help choose a cue; never sent or analyzed. |

Actual delivery also varies between generations. Tags express intent;
voice selection and the model still matter.

## Three small situations

### A visitor arrives

```ts
renderSpeech("Hello, welcome! I am glad you could make it today.", {
  tone: "warm, friendly",
});
// [warm, friendly] Hello, welcome! I am glad you could make it today.
```

[▶ Hear the greeting](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/welcome.mp3)

### An order is late

```ts
renderSpeech(
  "I am sorry about the delay. Let me check the latest delivery update for you.",
  { tone: "calm, apologetic" },
);
// [calm, apologetic] I am sorry about the delay. Let me check...
```

[▶ Hear the response](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/delay.mp3)

### A missing bag is found

```ts
renderSpeech(
  "We found it! Your bag is at the front desk, and you can pick it up now.",
  { tone: "relieved, cheerful", reaction: "exhales" },
);
// [relieved, cheerful] [exhales] We found it! Your bag is at...
```

[▶ Hear the good news](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/discovery.mp3)

## Change tone halfway through

```ts
import { renderSegments } from "elevenlabs-delivery-renderer";

renderSegments([
  { text: "Let me check. ", cue: { tone: "thoughtful" } },
  { text: "It is ready!", cue: { tone: "cheerful" } },
]);
// sourceText: "Let me check. It is ready!"
// speechText: "[thoughtful] Let me check. [cheerful] It is ready!"
```

The caller chooses the boundary and supplies all spaces and punctuation.

## Render streamed text

```ts
import { createSpeechStream } from "elevenlabs-delivery-renderer";

const stream = createSpeechStream({ tone: "warm" });
stream.push("");        // ""
stream.push("Hello");   // "[warm] Hello"
stream.push(", world"); // ", world"
```

One instance per utterance. The cue is captured at creation. Only the first
nonempty chunk gets the prefix. Nothing is buffered and no spaces are added.
The helper opens no socket; your transport must support incremental text.

## Try it

```sh
git clone https://github.com/mmf-code/elevenlabs-delivery-renderer.git
cd elevenlabs-delivery-renderer
npm ci
npm run demo
```

Open **http://127.0.0.1:4317**. Edit a situation, text, tone, reaction,
previous spoken text, voice ID, or model. The preview shows the exact request.
Recorded samples work without credentials.

For new audio, set `ELEVENLABS_API_KEY` in the server environment before
starting the demo. The key stays on the server. Generation uses your account
credits. The loopback-only demo is for local development.

The [Text to Dialogue](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert)
adapter sends a body like this:

```json
{
  "inputs": [{ "text": "[warm] Hello", "voice_id": "JBFqnCBsd6RMkjVDRZzb" }],
  "model_id": "eleven_v4",
  "previous_text": "Come in."
}
```

`previous_text` is optional preceding dialogue, not an instruction prompt;
the demo accepts up to 100 characters. The API key goes in the server's
`xi-api-key` header. The demo supports v4 and v3 without silent fallback.
See [ElevenLabs audio tags](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)
for provider guidance.

## Use it in another project

The package is not yet on npm. Build this checkout and install it locally:

```sh
npm run build
# Run in your consuming project:
npm install /absolute/path/to/elevenlabs-delivery-renderer
```

```ts
import { renderSpeech } from "elevenlabs-delivery-renderer";

const { sourceText, speechText } = renderSpeech("Hello!", { tone: "warm" });
// display sourceText; send speechText to the provider
```

## Small API, explicit limits

| Function | Purpose |
| --- | --- |
| `renderSpeech(text, cue?)` | Render one complete utterance. |
| `renderSegments(segments)` | Render caller-defined delivery changes. |
| `createSpeechStream(cue?)` | Prefix the first nonempty chunk once. |
| `sanitizeCue(unknown)` | Drop malformed cue fields and ignore unknown metadata. |

Tones allow letters, combining marks, spaces, commas, hyphens, and apostrophes:
up to 64 UTF-16 code units and eight space/comma-separated words. Reactions
are `sighs`, `laughs`, or `exhales`. Brackets and newlines in cues are rejected.

```ts
sanitizeCue({ tone: "warm] [shouts", reaction: "sighs" });
// { reaction: "sighs" }

renderSpeech("Hello!");
// { sourceText: "Hello!", speechText: "Hello!" }
```

Source text passes through exactly, including existing brackets and tags.
The library does not sanitize speech text or guarantee acoustic output.
It includes no emotion inference, prompts, intensity policies, automatic
anchor matching, character state, or voice assets.

## Development

```sh
npm test
npm run example
npm pack --dry-run
```

CI tests Node 22 and 24. The npm payload contains the built library, README,
and license. The playground and recorded examples live in the repository.

`npm run samples` regenerates the three situation clips.
`npm run samples -- --comparisons` regenerates the four same-sentence clips.
Both use your server-side key, incur provider usage, and overwrite the respective
files. Exact requests are in the [situation manifest](examples/audio/manifest.json)
and [comparison manifest](examples/audio/comparisons-manifest.json).

## License

Code: [MIT](LICENSE). Audio generated with [ElevenLabs](https://elevenlabs.io);
see [sample attribution and usage notes](examples/audio/README.md).
Independent project, unaffiliated with ElevenLabs. The software license
grants no service access or voice rights; [API terms](https://elevenlabs.io/elevenapi-terms)
still apply.
