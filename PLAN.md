# Standalone renderer plan

## Release boundary

Build a fresh, independently implemented TypeScript package for explicit
ElevenLabs delivery cues. Publish only the generic rendering mechanism.

Public scope:
- A short tone and optional vocal reaction supplied by the caller.
- Whole-text rendering with separate source and speech outputs.
- Explicit segment boundaries for caller-selected tone changes.
- A streaming prefix helper with immediate forwarding and no buffering.
- Syntax validation, synthetic examples, deterministic tests, and documentation.
- A loopback-only playground with editable public presets and exact request preview.
- Optional previous spoken text for provider continuity; situation notes stay local.
- Three actual provider-generated audio files with request provenance.

Excluded scope:
- Simulation code, characters, scenarios, assessment, and scoring.
- Prompts, model calls, contextual inference, and emotion-selection policies.
- Automatic transition-anchor matching, intensity heuristics, and fallback mappings.
- Production gateway transport, authentication, telemetry, and configuration.
- Customer transcripts, recordings, private voice assets, and repository history.

## Implementation and release sequence

1. Create a new sibling repository without copying files or history.
2. Implement the public API with no runtime dependencies.
3. Prove exact source preservation, tag validation, and chunk-split equivalence.
4. Write English-only documentation, a local playground, and server-side ElevenLabs examples.
5. Inspect the complete package payload and staged files for accidental private content.
6. Commit, create the public GitHub repository, push, and inspect CI.

## Evidence boundary

Tests prove string rendering and package behavior. They do not prove subjective
audio quality, model acceptance of every tone, latency, or provider availability.
The three sample files establish actual provider generation only; subjective
listening evaluation is not claimed. npm publication is outside this release.
