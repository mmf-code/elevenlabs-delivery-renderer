# Conversation-driven delivery

The user supplies a situation and preceding conversation. One model generation
returns the reply and vocal delivery together. The renderer creates the tagged
speech transcript at the model's chosen segment boundaries. Tone and vocal
reaction directions use open vocabulary. No user-authored metadata or additional emotion-analysis
call is required. An optional fixed line is preserved exactly.

The main demo shows the reply, tagged transcript, and audio. Model instructions,
delivery metadata, and provider requests live in collapsed technical details.
Fresh generation runs locally; the hosted page labels its recorded examples.

The pipeline accepts any generate(request) callback. The current demo connection
is isolated in model.mjs and an optional adapter. Three synthetic examples record
actual joint text/delivery generations and speech synthesis. Tests use mocks
and prove one model call per reply, validation, and stale-result rejection.

This package includes no proprietary simulation prompts, character policies,
state engine, scoring, automatic transition matching, custom voices, customer
conversations, production telemetry, or private repository history.

Document the relationship to EVRE as a reduced standalone edition. Avoid
comparative quality claims without a controlled listening evaluation.
