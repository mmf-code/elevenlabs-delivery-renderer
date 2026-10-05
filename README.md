# ElevenLabs Delivery Renderer

Let the conversation shape the voice.

```text
situation + conversation
          ↓
your model creates { text, delivery } together
          ↓
renderer adds [voice tags]
          ↓
ElevenLabs speaks the reply
```

Tension, irritation, uncertainty, and relief can change as a conversation
unfolds. The model chooses the wording and how it should sound **in the same
generation**. The renderer turns that delivery into audio tags.

The user writes the situation and conversation. They do not write metadata
or choose an emotion from a menu.

**[Try the examples →](https://mmf-code.github.io/elevenlabs-delivery-renderer/)**

## See it happen

The demo shows the generated reply, the speech transcript, and audio.
Change the situation or conversation to create a new reply. Prompts and
generated delivery metadata are available under **Technical details**.

| Situation | Model-selected delivery | Real generated audio |
| --- | --- | --- |
| A traveler worries their reservation was lost. | `Warm and reassuring` | [▶ Listen](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/context-reassurance.mp3) |
| A tired colleague is interrupted again. | `thin patience` + `exhales` | [▶ Listen](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/context-irritation.mp3) |
| A new employee faces an unfamiliar question. | `uncertain` | [▶ Listen](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/context-uncertainty.mp3) |

Each example is a real model-generated reply and delivery, followed by
ElevenLabs synthesis. There are no preset cues in the
[example inputs](examples/context-examples.json). The
[manifest](examples/audio/context-manifest.json) contains the exact inputs,
generated words, delivery, and speech request.

These are recorded generations, not fixed answers. A fresh model call may
choose a different reply and tone.

## Run locally

```sh
git clone https://github.com/mmf-code/elevenlabs-delivery-renderer.git
cd elevenlabs-delivery-renderer
npm ci
npm run demo
```

Open **http://127.0.0.1:4317**. Set up your model connection in
[demo/model.mjs](demo/model.mjs) and provide a server-side ElevenLabs key.

The hosted page plays recordings. Fresh reply generation and audio run in
the local demo. Automatic updates after edits are optional; audio is created
only when requested. One update uses one model generation, with no separate
emotion-analysis request.

## Connect the model you already use

The pipeline accepts a `generate(request)` callback:

```js
import { prepareSpeech } from "./demo/speech-pipeline.mjs";

const result = await prepareSpeech({
  situation: "A customer has been waiting for an update.",
  transcript: "Customer: This is the third time I have called.",
}, {
  generate: async (request) => {
    // Call your model once with the conversation and delivery instruction.
    // Return its generated reply and delivery together:
    return await yourModel.generateReply(request);
    // { text: "...", delivery: { tone: "...", reaction: "none" } }
  },
});

result.speech.sourceText; // generated reply for display
result.speech.speechText; // [model-selected tone] generated reply
```

Replace the demo's model connection with this callback. No particular
language model is required by the renderer or pipeline. The included
[optional adapter](demo/adapters/gemini.mjs) uses the server environment
variables listed in [.env.example](.env.example); the demo does not load
that file automatically.

Keep keys on the server. Send only synthetic or consented conversations.

## Already generating replies?

Have your existing model return delivery alongside its reply and pass it
straight to the renderer:

```ts
import { renderSpeech, createSpeechStream } from "elevenlabs-delivery-renderer";

const speech = renderSpeech(turn.text, turn.delivery);

// If your transport accepts incremental text:
const stream = createSpeechStream(turn.delivery);
stream.push("Hello");   // opening tags + Hello
stream.push(", world"); // , world
```

No extra model call is needed. One streaming renderer per reply. It emits
the opening tags once, forwards text immediately, and opens no network
connection. Your application owns the model and speech transport.

For an existing fixed line, the demo's optional speech settings let you
supply it exactly; the same generation chooses delivery without rewriting it.

## Scope

- Zero runtime dependencies in the renderer.
- Model-generated delivery, without fixed situation-to-tone rules.
- Original words kept separate from tagged speech text.
- Edits invalidate old replies; stale results cannot overwrite a new turn.
- No simulation engine, character policies, scoring, or private voice assets.

The demo uses complete-response generation and Eleven v4 HTTP synthesis.
The renderer can also feed tags to an existing v4 Turbo streaming transport;
this demo does not reproduce a production streaming voice stack.

`renderSpeech`, `renderSegments`, `createSpeechStream`, and `sanitizeCue`
are exported by the library. The package is not yet on npm; build this
checkout and install it from a local path.

## Checks and recordings

```sh
npm test
npm run site
npm run samples:context
```

Tests prove single-call generation, automatic delivery, exact preservation
of a supplied line, validation, and stale-result rejection. Recorded examples
separately establish actual model and speech-provider calls.
Regenerating them consumes provider quota.

Code: [MIT](LICENSE). Audio generated with [ElevenLabs](https://elevenlabs.io);
see [sample attribution](examples/audio/README.md). Software licensing grants
no provider service access or voice rights.
