/**
 * Deterministic intent safety net.
 *
 * gemma-4-26b is a small model: at temperature 0 it routes the same sentence
 * the same way every time, but for the room-operation commands it routes on
 * salient words ("repo" -> spawn_room, "room" -> add_agents) and ignores both
 * the tool descriptions and the persona's routing rules. The room-op verbs are
 * distinctive enough to recognize reliably in code, so the gateway runs this
 * over the user's actual utterance: when it confidently recognizes the intent,
 * it overrides the model's pick; otherwise it returns null and trusts the model
 * (which already nails spawn_room and the plain "pull up X" opens).
 *
 * Pure and config-free so it unit-tests without the model or the gateway. The
 * open_url url is left as a hint string ("the website", a phrase, an issue URL);
 * the open_url handler resolves it the same way it resolves the model's url.
 */

export type Intent = { tool: string; args: Record<string, unknown> };

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  "a couple": 2, "a couple of": 2, "a few": 3, "another": 1, "a pair": 2,
};

/** "the dark mode room" -> "dark mode"; "...on the login fix" -> "login". */
function extractTopic(u: string): string | null {
  // The 1-2 words right before room/fix/work, skipping a leading article or
  // preposition. Several can appear ("the team on the login fix"); the one
  // ADJACENT to room/fix is the topic, so take the last match.
  const re =
    /\b(?!the\b|a\b|an\b|on\b|at\b|to\b|our\b|that\b)([a-z0-9][a-z0-9-]*(?:\s+[a-z0-9-]+)?)\s+(?:room|fix|work|task)\b/g;
  let m: RegExpExecArray | null;
  let last: string | null = null;
  while ((m = re.exec(u)) !== null) last = m[1].trim();
  return last;
}

/** "two more" -> 2, "double" -> 2, "a couple more" -> 2, else 1. */
function extractCount(u: string): number {
  if (/\bdouble\b/.test(u)) return 2;
  const m = u.match(/\b(\d+|a couple of|a couple|a few|a pair|one|two|three|four|five|six|seven|eight|nine|ten|another)\b\s+more\b/);
  if (m) {
    const tok = m[1];
    return /^\d+$/.test(tok) ? parseInt(tok, 10) : WORD_NUMBERS[tok] ?? 1;
  }
  const n = u.match(/\b(\d+|two|three|four|five|six|seven|eight|nine|ten)\b\s+(?:more\s+)?(?:agents?|hands|people)\b/);
  if (n) return /^\d+$/.test(n[1]) ? parseInt(n[1], 10) : WORD_NUMBERS[n[1]] ?? 1;
  return 1;
}

/** The instruction after "to": "...room to keep the logo readable" -> "keep the logo readable". */
function extractMessage(original: string): string {
  const m = original.match(/\bto\s+(.+?)[.?!]*$/i);
  if (m) return m[1].trim();
  return original.trim();
}

/** A resolvable url hint for the open_url handler. */
function extractUrlHint(u: string): string {
  const issue = u.match(/\bissue\s+#?(\d+)/) ?? u.match(/\bpr\s+#?(\d+)/);
  if (issue) {
    const kind = /\bpr\b/.test(u) ? "pull" : "issues";
    return `https://github.com/langwatch/langwatch/${kind}/${issue[1]}`;
  }
  if (/\b(repo|repository|github|codebase)\b/.test(u) || /\blangwatch\b/.test(u)) return "langwatch";
  return "the website";
}

const STATUS_RE =
  /\b(how'?s it going|how are (?:things|they|we)|how'?s the .*(?:room|going|coming)|what'?s everyone (?:working on|doing|up to)|what is everyone (?:working on|doing)|any update|what'?s the status|give me (?:a|the) (?:quick )?status|status on|where are we|are we (?:there|done))\b/;

const ADD_RE =
  /\b(?:throw|add|put|get|toss|bring)\b[^.?!]*\b(?:more|extra|another|additional)\b[^.?!]*\b(?:agents?|hands|people|bodies)\b|\b(?:double|triple)\b[^.?!]*\b(?:the\s+)?(?:team|agents?|headcount)\b|\b(?:two|three|four|five|\d+|a couple|a few)\s+more\b/;

// "tell/remind the room ...", "let them know ...", "have them ...". Note the
// guarded have/ask: "have a couple of agents research X" is spawn_room work,
// NOT a message, so bare "have ... agents" must not match here.
const TELL_RE =
  /\b(?:tell|remind|message|warn|nudge)\b[^.?!]*\b(?:room|team|agents?|them)\b|\b(?:let them know|have them|ask them|let the [a-z0-9 -]+ room)\b/;

const KILL_RE =
  /\b(?:kill|shut down|shutdown|close|tear down|disband|wind down|stop)\b[^.?!]*\b(?:room|agents?|swarm|team)\b|\bwe'?re done with\b/;

const SHOW_RE =
  /\b(?:show me|pull up|bring up|put\b[^.?!]*\bon (?:the )?screen|throw\b[^.?!]*\bon (?:the )?screen|let'?s see|open (?:the |up )?(?:repo|repository|site|website|issue|pr|page|dashboard|link))\b/;

const WORK_RE =
  /\b(build|implement|fix|redesign|refactor|research|investigate|integrat|dark mode|feature|migrat|set up|write (?:the|a|some)|look into|spin up|get \w+ agents on)\b/;

/**
 * Recognize a room-operation or show intent from the spoken utterance. Returns
 * a full tool + args when confident, or null to defer to the model.
 */
export function correctIntent(utterance: string): Intent | null {
  const original = utterance.trim();
  const u = original.toLowerCase();
  if (!u) return null;

  // Status question -> read the rooms back. (Check first: "how's the dark mode
  // room doing" must not be mistaken for an add/steer.)
  if (STATUS_RE.test(u)) {
    return { tool: "check_progress", args: { scope: extractTopic(u) ?? "all" } };
  }

  // Tear a room down.
  if (KILL_RE.test(u)) {
    return { tool: "close_room", args: { topic: extractTopic(u) ?? "" } };
  }

  // More agents on an existing room.
  if (ADD_RE.test(u)) {
    return { tool: "add_agents", args: { topic: extractTopic(u) ?? "", count: extractCount(u) } };
  }

  // A note/reminder to a running room.
  if (TELL_RE.test(u)) {
    return {
      tool: "message_room",
      args: { topic: extractTopic(u) ?? "", message: extractMessage(original) },
    };
  }

  // Show an existing thing on the screen — but never when it's actually work
  // ("show me what dark mode looks like" is build, not display).
  if (SHOW_RE.test(u) && !WORK_RE.test(u)) {
    return { tool: "open_url", args: { url: extractUrlHint(u) } };
  }

  return null; // trust the model: spawn_room work + plain "pull up the website"
}
