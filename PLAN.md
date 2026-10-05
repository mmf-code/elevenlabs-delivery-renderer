# Context-driven delivery boundary

The demo now demonstrates context → model-selected delivery → deterministic
renderer → ElevenLabs speech. A newly authored public instruction and a Gemini
adapter let users change arbitrary situations, transcripts, and JSON metadata.
There is no preset situation-to-tone mapping or scripted inference fallback.

The library remains a generic renderer and public prompt builder. The network
adapter is a separate demo module. Source words are never rewritten.

The local playground supports fresh inference and optional debounced updates.
The hosted static explorer updates prompts immediately and shows recorded
results only for exact matching inputs, with explicit provenance. It runs no
inference backend and stores no keys. Editing invalidates cues and playback;
late results are rejected.

Three synthetic examples record actual model calls followed by ElevenLabs
generation, with exact public prompts and provider metadata in the manifest.
Deterministic tests use mocks and do not prove acoustic accuracy or latency.

Excluded: proprietary prompts, simulation code, character state, measurement,
scoring, contextual heuristics, automatic transition matching, custom voices,
customer conversations, production telemetry, and private repository history.
