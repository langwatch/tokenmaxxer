import { desktop, pageSlot } from "../desktop/index.js";
import { log } from "../log.js";
import { rooms } from "../orchestrator/room.js";
import { resolveOpenUrl } from "./url.js";

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

  async close_room(args) {
    const topic = String(args.topic ?? "").trim();
    if (!topic) throw new Error("close_room needs a topic");
    const note = rooms.closeRoom(topic);
    return { output: { status: "closing", note } };
  },

  async check_progress(args) {
    const scope = String(args.scope ?? "all");
    const report = await rooms.progressReport(scope);
    return { output: { report } };
  },
};

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolOutcome> {
  const handler = handlers[name];
  if (!handler) throw new Error(`unknown tool: ${name}`);
  return handler(args);
}
