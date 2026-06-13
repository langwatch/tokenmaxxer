import { desktop, pageSlot } from "../desktop/index.js";
import { log } from "../log.js";
import { resolveProject } from "../orchestrator/projects.js";
import { rooms } from "../orchestrator/room.js";

/** The room's single browser window — re-pointed as URLs are opened. */
const SCREEN_WINDOW_KEY = "screen";

export interface ToolOutcome {
  output: Record<string, unknown>;
  /** Side-effect for clients, e.g. navigate the room screen. */
  navigate?: string;
}

type Handler = (args: Record<string, unknown>) => Promise<ToolOutcome>;

const handlers: Record<string, Handler> = {
  async spawn_room(args) {
    const mission = String(args.mission ?? "").trim();
    const topic = String(args.topic ?? "").trim() || "the mission";
    if (!mission) throw new Error("spawn_room needs a mission");
    const agents =
      typeof args.agents === "number" ? args.agents : Number(args.agents) || undefined;
    const project = args.project ? String(args.project) : undefined;
    const note = rooms.spawnRoom({ mission, topic, agents, project });
    return { output: { status: "spawning", note } };
  },

  async message_room(args) {
    const topic = String(args.topic ?? "").trim();
    const message = String(args.message ?? "").trim();
    if (!topic || !message) throw new Error("message_room needs a topic and a message");
    const note = rooms.messageRoom({ topic, message });
    return { output: { status: "sent", note } };
  },

  async add_agents(args) {
    const topic = String(args.topic ?? "").trim();
    if (!topic) throw new Error("add_agents needs a topic");
    const count =
      typeof args.count === "number" ? args.count : Number(args.count) || undefined;
    const note = rooms.addAgents({ topic, count });
    return { output: { status: "added", note } };
  },

  async open_url(args) {
    const url = resolveOpenUrl(String(args.url ?? ""), args.label ? String(args.label) : undefined);
    if (!url) throw new Error("open_url needs a url");
    log("tools", `open_url ${url}`);
    void desktop().openBrowser({ url, key: SCREEN_WINDOW_KEY, slot: pageSlot() });
    return {
      output: {
        status: "opened",
        url,
        note: `On the screen now${args.label ? ` (${String(args.label)})` : ""}.`,
      },
      navigate: url,
    };
  },

  async check_progress(args) {
    const scope = String(args.scope ?? "all");
    const report = await rooms.progressReport(scope);
    return { output: { report } };
  },
};

/**
 * Turn whatever the voice model passes into a real URL. A genuine remote URL
 * (a GitHub issue, a dashboard) is trusted exactly as given. But the model
 * loves to invent a dev port ("localhost:3000") or just name the site ("the
 * website") — those resolve to the project's real URL from the registry, so
 * "pull up the website" always lands on the running site, not a guess.
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
function normalizeUrl(raw: string): string {
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)/.test(raw)) return `http://${raw}`;
  return `https://${raw}`;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolOutcome> {
  const handler = handlers[name];
  if (!handler) throw new Error(`unknown tool: ${name}`);
  return handler(args);
}
