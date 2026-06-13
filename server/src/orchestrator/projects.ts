import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Where agents work. A spoken hint ("the website", "langwatch", "the repo")
 * resolves to a real checkout on this machine plus the URL to show on the
 * room screen. This is deterministic on purpose — no LLM in the hot path, so
 * dispatch is instant and spends no tokens guessing a directory.
 */
export interface Project {
  id: string;
  /** Lowercase phrases that should resolve to this project. */
  aliases: string[];
  /** Absolute workspace the agents run in. */
  dir: string;
  /** What to open on the room screen for this project, if it has a UI. */
  url?: string;
}

const home = os.homedir();

const PROJECTS: Project[] = [
  {
    id: "website",
    aliases: [
      "website",
      "the website",
      "site",
      "the site",
      "landing",
      "landing page",
      "homepage",
      "home page",
      "marketing site",
      "langwatch website",
      "langwatch site",
      "2lang",
      "2lang-2watch",
      "new website",
    ],
    dir: path.join(home, "Projects", "2lang-2watch"),
    url: process.env.TOKENMAXXER_SITE_URL ?? "http://127.0.0.1:5173",
  },
  {
    id: "langwatch",
    aliases: [
      "langwatch",
      "the platform",
      "the app",
      "the repo",
      "the product",
      "the backend",
      "main repo",
      "the codebase",
    ],
    dir: path.join(home, "Projects", "langwatch"),
    url: "https://github.com/langwatch/langwatch",
  },
];

/** The project assumed when a request names no project — the demo default. */
export const DEFAULT_PROJECT_ID =
  process.env.TOKENMAXXER_DEFAULT_PROJECT ?? "website";

function byId(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id);
}

/**
 * Resolve a spoken hint to a project. Matches the longest alias contained in
 * the hint so "the langwatch website" beats the bare "langwatch". Falls back
 * to the default project (never throws — a swarm with a sane default beats a
 * dispatch that fails because a word was off).
 */
export function resolveProject(hint?: string): Project {
  const text = (hint ?? "").toLowerCase();
  if (text.trim()) {
    let best: { project: Project; len: number } | null = null;
    for (const project of PROJECTS) {
      for (const alias of project.aliases) {
        if (text.includes(alias) && (!best || alias.length > best.len)) {
          best = { project, len: alias.length };
        }
      }
    }
    if (best) return best.project;
  }
  return byId(DEFAULT_PROJECT_ID) ?? PROJECTS[0];
}

/** A project whose checkout actually exists on disk, for launching agents. */
export function resolveExistingProject(hint?: string): Project {
  const project = resolveProject(hint);
  if (fs.existsSync(project.dir)) return project;
  const fallback = byId(DEFAULT_PROJECT_ID) ?? PROJECTS[0];
  return fs.existsSync(fallback.dir) ? fallback : project;
}

export function listProjects(): Project[] {
  return [...PROJECTS];
}
