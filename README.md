# ElevenLabs Delivery Renderer

Let the conversation shape the voice.

A deliberately reduced, standalone edition of the context-driven voice delivery
approach used in [EVRE](https://evre.ai). It keeps the conversation-to-voice idea
without the simulation runtime, private prompts, character state, or production
voice infrastructure. It is not a benchmark of EVRE's voice quality.

```text
situation + conversation
          ↓
your model creates spoken segments + delivery together
          ↓
renderer adds [voice tags]
          ↓
ElevenLabs speaks the reply
```

Tension, irritation, uncertainty, and relief can change as a conversation
unfolds. The model chooses the wording and how it should sound **in the same
generation**. The model also chooses where delivery changes within the reply.
The renderer turns those directions into audio tags at the chosen boundaries.

Directions use open vocabulary, not a fixed emotion menu: `[barely containing
irritation]`, `[quietly relieved]`, or `[clears throat]` are possible. Syntax and
length limits keep tags well formed; they do not define an emotion taxonomy.
Audio tags guide synthesis; arbitrary descriptions are not guaranteed to produce
a distinct or accurate effect. See [ElevenLabs audio tags](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech).

The user writes the situation and conversation. They do not write metadata
or choose an emotion from a menu.

**[Try the examples →](https://mmf-code.github.io/elevenlabs-delivery-renderer/)**

## See it happen

The demo shows the generated reply, the speech transcript, and audio.
Change the situation or conversation to create a new reply. Prompts and
generated delivery metadata are available under **Technical details**.

| Situation | Model-selected delivery | Real generated audio |
| --- | --- | --- |
| A traveler worries their reservation was lost; the receptionist finds it. | reassuring → apologetic → relieved → welcoming | [▶ Listen · 22s](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/context-reassurance.mp3) |
| A colleague asks again, then admits fear of making a mistake. | firm → direct → supportive → warm | [▶ Listen · 14s](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/context-irritation.mp3) |
| A new employee finds a specification with a relevant limitation. | relieved → confident → informative → cautious → supportive | [▶ Listen · 22s](https://raw.githubusercontent.com/mmf-code/elevenlabs-delivery-renderer/main/examples/audio/context-uncertainty.mp3) |

Here are the actual generated speech transcripts. These words, directions,
and boundaries came from the model, not the example file or a mapping table.

<details>
<summary>Reservation found: concern, explanation, then reassurance</summary>

```text
[reassuring, warm] I completely understand your worry, but you can rest easy now. [apologetic, polite] [soft exhale] My colleague accidentally swapped two letters in your surname, which is why it did not pop up initially. [helpful, relieved] I have successfully corrected that in our system, and your prepaid room is fully ready for you right this moment. [welcoming, kind] Let me get your room key programmed right away so you can finally get some sleep.
```

</details>

<details>
<summary>Repeated interruption: directions change inside the sentence</summary>

```text
[firm yet empathetic] [sighs] Look, I get that you are worried about messing up with the client,[direct and reassuring]  but I typed the exact final number right there in black and white.[encouraging and supportive]  Trust the email, copy it directly from the second paragraph,[warm]  and you will be completely fine.
```

</details>

<details>
<summary>Compatibility checked: confidence with a cautious qualification</summary>

```text
[relieved and helpful] Thanks for bearing with me while I checked.[confident]  I've got the official manufacturer compatibility sheet right here.[informative]  It does confirm that this adapter fully supports your two-display configuration at sixty hertz.[cautious]  However, it won't handle that setup at one hundred twenty hertz.[supportive and engaging]  Knowing that limitation, would you still like to go ahead with the purchase, or should we look at a higher-end model?
```

</details>

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
    // Return its generated segments and delivery together:
    return await yourModel.generateReply(request);
    // { segments: [{ text: "... ", tone: "...", reaction: "none" }, ...] }
  },
});

result.speech.sourceText; // generated reply for display
result.speech.speechText; // tags at model-selected points throughout the reply
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
import { renderSegments, createSpeechStream } from "elevenlabs-delivery-renderer";

const speech = renderSegments(turn.segments);
// Each segment is { text: "...", cue: { tone: "...", reaction: "..." } }.

// If your transport accepts incremental text:
const stream = createSpeechStream(turn.segments[0]?.cue);
stream.push("Hello");   // opening tags + Hello
stream.push(", world"); // , world
```

No extra model call is needed. `renderSegments` handles interior tone changes.
The smaller `createSpeechStream` helper handles an opening direction only:
use one instance per reply. It emits the opening tags once, forwards text immediately, and opens no network
connection. Your application owns the model and speech transport.

For an existing fixed line, the demo's optional speech settings let you
supply it exactly; the same generation chooses delivery without rewriting it.

## Scope

- Zero runtime dependencies in the renderer.
- Model-generated delivery, without fixed situation-to-tone rules.
- Model-selected segment boundaries, including interior sentence boundaries.
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

With the local demo running, `node examples/check-context.mjs` makes two real
model calls using **identical spoken words in different conversations**. It
checks word preservation, interior directions, and different tagged results.
The latest [live check](examples/context-check.json) records both inputs and
outputs. This checks the context-to-delivery path, not perceived audio quality.

Tests prove single-call generation, automatic interior delivery, exact preservation
of a supplied line, validation, and stale-result rejection. Recorded examples
separately establish actual model and speech-provider calls.
Regenerating them consumes provider quota.

Code: [MIT](LICENSE). Audio generated with [ElevenLabs](https://elevenlabs.io);
see [sample attribution](examples/audio/README.md). Software licensing grants
no provider service access or voice rights.
