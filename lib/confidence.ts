// Client-safe confidence helpers. Kept in their own module so that
// client-bundled code (validation, UI) never transitively imports the
// server-only LLM extraction provider / Anthropic SDK.

export const CONFIDENCE_THRESHOLD = 0.8;

export function isLowConfidence(score: number): boolean {
  return score < CONFIDENCE_THRESHOLD;
}
