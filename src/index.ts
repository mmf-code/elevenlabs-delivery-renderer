export { buildContextPrompt, normalizeContextInput, CONTEXT_INSTRUCTION } from "./context.js";
export type { ContextInput } from "./context.js";

/** Explicit delivery instructions supplied by the calling application. */
export interface DeliveryCue {
  /** A short voice direction, such as "warm" or "quietly curious". */
  tone?: string;
  /** An optional vocal reaction before the text. */
  reaction?: "sighs" | "laughs" | "exhales";
}

export interface SpeechSegment {
  text: string;
  cue?: DeliveryCue;
}

export interface RenderedSpeech {
  /** The exact supplied text, suitable for display or storage. */
  sourceText: string;
  /** Text with audio tags, suitable for the speech provider. */
  speechText: string;
}

const REACTIONS = new Set(["sighs", "laughs", "exhales"]);
const TONE = /^[\p{L}\p{M}]+(?:[ ,'-]+[\p{L}\p{M}]+)*$/u;

/**
 * Invalid fields are omitted independently. Unknown properties are ignored.
 * This validates tag syntax; it does not infer emotion or judge appropriateness.
 */
export function sanitizeCue(input: unknown): DeliveryCue {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  // Catch hostile getters/proxies as well as ordinary malformed input.
  try {
    const raw = input as Record<string, unknown>;
    const result: DeliveryCue = {};
    const tone = raw.tone;
    if (typeof tone === "string" && !/[\r\n\t]/u.test(tone)) {
      const normalized = tone.trim().replace(/ +/gu, " ");
      if (
        normalized.length <= 64 &&
        normalized.split(/[ ,]+/u).length <= 8 &&
        TONE.test(normalized)
      ) {
        result.tone = normalized;
      }
    }
    const reaction = raw.reaction;
    if (typeof reaction === "string" && REACTIONS.has(reaction)) {
      result.reaction = reaction as DeliveryCue["reaction"] & string;
    }
    return result;
  } catch {
    return {};
  }
}

function prefix(input: unknown): string {
  const cue = sanitizeCue(input);
  return [cue.tone, cue.reaction]
    .filter((tag): tag is string => tag !== undefined)
    .map((tag) => `[${tag}] `)
    .join("");
}

/** Render a complete utterance. Empty text emits no tags. */
export function renderSpeech(text: string, cue?: DeliveryCue): RenderedSpeech {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  return { sourceText: text, speechText: text ? prefix(cue) + text : text };
}

/**
 * Place a cue at each explicit segment boundary. No automatic matching or
 * inserted separators: the caller supplies all spaces and punctuation.
 */
export function renderSegments(segments: readonly SpeechSegment[]): RenderedSpeech {
  let sourceText = "";
  let speechText = "";
  for (const segment of segments) {
    const rendered = renderSpeech(segment.text, segment.cue);
    sourceText += rendered.sourceText;
    speechText += rendered.speechText;
  }
  return { sourceText, speechText };
}

/**
 * One instance per utterance. Prefix the first nonempty chunk once; forward
 * every chunk immediately. Chunk boundaries introduce no spaces or buffering.
 */
export function createSpeechStream(cue?: DeliveryCue): {
  push(chunk: string): string;
} {
  const opening = prefix(cue);
  let started = false;
  return {
    push(chunk: string): string {
      if (typeof chunk !== "string") throw new TypeError("chunk must be a string");
      if (!chunk) return "";
      if (started) return chunk;
      started = true;
      return opening + chunk;
    },
  };
}
