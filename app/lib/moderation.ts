// Basic input-level content filter. Blocks obviously vulgar, sexual, or
// otherwise inappropriate topic requests before they ever reach the model,
// so the tool stays strictly educational/professional.
//
// This is a first line of defense (keyword-based, not exhaustive). The
// system prompt sent to Claude is the second line — it explicitly instructs
// a professional, scientific tone regardless of topic, and Claude's own
// safety training is the third.

const BLOCKED_PATTERNS: RegExp[] = [
  /ک[\s\u200c]?و[\s\u200c]?س/i,
  /ک[\s\u200c]?ی[\s\u200c]?ر/i,
  /ک[\s\u200c]?س[\s\u200c]?کش/i,
  /جنده/i,
  /گاییدن|گایید|بگا/i,
  /سکس(ی)?/i,
  /پورن/i,
  /کون(ی)?(?!\s*ه)/i,
  /\bfuck/i,
  /\bshit\b/i,
  /\bporn/i,
  /\bsex\b/i,
  /\bnude/i,
  /\brape/i,
];

export function isInappropriate(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized));
}
