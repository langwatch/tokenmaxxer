import { resolveProject } from "../orchestrator/projects.js";

/**
 * Turn whatever the voice model passes into a real URL. A genuine remote URL
 * (a GitHub issue, a dashboard) is trusted exactly as given. But the model
 * loves to invent a dev port ("localhost:3000") or just name the site ("the
 * website") — those resolve to the project's real URL from the registry, so
 * "pull up the website" always lands on the running site, not a guess.
 *
 * Config-free (only the project registry) so it unit-tests without booting
 * the gateway.
 */
export function resolveOpenUrl(rawUrl: string, label?: string): string {
  const raw = rawUrl.trim();
  const localGuess = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(raw);
  if (/^https?:\/\//i.test(raw) && !localGuess) return raw;
  // A bare phrase ("the website") has no dot or slash; a localhost guess or an
  // empty url both mean "the site we're talking about".
  const looksLikePhrase = !/[./]/.test(raw);
  if (localGuess || looksLikePhrase || !raw) {
    const project = resolveProject(`${raw} ${label ?? ""}`);
    if (project.url) return project.url;
  }
  return normalizeUrl(raw);
}

/** Add a scheme to a partial-but-real URL ("example.com/x" → https://…). */
export function normalizeUrl(raw: string): string {
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)/.test(raw)) return `http://${raw}`;
  return `https://${raw}`;
}
