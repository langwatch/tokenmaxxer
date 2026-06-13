import { EventEmitter } from "node:events";
import fs from "node:fs";
import { config } from "../config.js";
import { desktop, terminalSlotForIndex } from "../desktop/index.js";
import type { FleetAgentView } from "../events.js";
import { log } from "../log.js";
import { buildAgentBrief, channelName } from "./brief.js";
import {
  kanbanCapture,
  kanbanChannelCreate,
  kanbanChannelHistory,
  kanbanChannelSend,
  kanbanKill,
  kanbanLaunch,
  kanbanSend,
  MAX_HANDLE,
} from "./kanban.js";
import { resolveExistingProject, type Project } from "./projects.js";

/** Short, phonetic agent names — picked from this pool so naming costs no
 * tokens and the room reads like a team, not a list of UUIDs. */
const NAME_POOL = [
  "aria", "bolt", "cleo", "dax", "enzo", "faye", "gus", "hana",
  "ivo", "juno", "kai", "lux", "mira", "nico", "opal", "remy",
];

const DEFAULT_AGENTS = 3;
const MAX_AGENTS = 10;

interface RoomAgent extends FleetAgentView {
  tmuxName: string;
  name: string;
  channel: string;
}

interface Room {
  topic: string;
  channel: string;
  project: Project;
  workspace: string;
  mission: string;
  agents: Map<string, RoomAgent>;
  createdAt: number;
}

/**
 * The room engine. A spoken mission becomes a swarm of Claude Code agents
 * that all land in ONE shared kanban channel and self-organize there — the
 * channel is the agent loop. The voice layer gets an ack in milliseconds
 * while launching happens in the background.
 */
export class RoomManager extends EventEmitter {
  private rooms = new Map<string, Room>();
  /** Names handed out, so two live agents never collide. */
  private usedNames = new Set<string>();
  /** Fan-out quadrant counter for the popped terminals. */
  private terminalCount = 0;
  private watcher: NodeJS.Timeout | null = null;
  private announcedDone = new Set<string>();

  /** Flat view of every agent across every room — the console fleet feed. */
  list(): FleetAgentView[] {
    const all: FleetAgentView[] = [];
    for (const room of this.rooms.values()) {
      for (const { tmuxName: _t, name: _n, channel: _c, ...view } of room.agents.values()) {
        all.push(view);
      }
    }
    return all;
  }

  roomCount(): number {
    return this.rooms.size;
  }

  private findRoom(topic: string): Room | undefined {
    const wanted = channelName(topic);
    const exact = this.rooms.get(wanted);
    if (exact) return exact;
    // Loose match so "dark mode" reaches a room created as "full dark mode".
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const w = norm(topic);
    for (const room of this.rooms.values()) {
      const t = norm(room.topic);
      if (t === w || t.includes(w) || w.includes(t)) return room;
    }
    return undefined;
  }

  private takeNames(count: number): string[] {
    const free = NAME_POOL.filter((n) => !this.usedNames.has(n));
    const picked: string[] = [];
    for (let i = 0; i < count; i++) {
      const name = free[i] ?? `agent-${this.usedNames.size + i + 1}`;
      this.usedNames.add(name);
      picked.push(name);
    }
    return picked;
  }

  /**
   * Spin up a brand-new room. Returns immediately with a spoken-friendly ack;
   * channel creation, agent launches, terminal pops and app focus all run in
   * the background.
   */
  spawnRoom(input: {
    mission: string;
    topic: string;
    agents?: number;
    project?: string;
  }): string {
    const count = Math.max(1, Math.min(MAX_AGENTS, Math.round(input.agents ?? DEFAULT_AGENTS)));
    const existing = this.findRoom(input.topic);
    if (existing) {
      // Same topic, fresh direction: speak into the room instead of forking it.
      void this.broadcastMission(existing, input.mission, "NEW DIRECTION from the room");
      return `That room's already live — passing it along to the ${existing.agents.size} agents on "${existing.topic}".`;
    }

    const project = resolveExistingProject(input.project ?? input.mission);
    const channel = this.uniqueChannel(input.topic);
    const room: Room = {
      topic: input.topic,
      channel,
      project,
      workspace: project.dir,
      mission: input.mission,
      agents: new Map(),
      createdAt: Date.now(),
    };
    this.rooms.set(channel, room);

    // Show provisional agents the instant the words are spoken.
    const names = this.takeNames(count);
    for (const name of names) {
      const slug = `${config.fleetPrefix}${name}`;
      room.agents.set(name, {
        slug,
        tmuxName: slug,
        name,
        channel,
        topic: input.topic,
        mission: input.mission,
        workspace: project.dir,
        status: "launching",
        lastActivity: "spinning up",
        launchedAt: Date.now(),
      });
    }
    this.emitFleet();

    void this.launchRoom(room, names).catch((err) => {
      log("room", `spawn failed: ${(err as Error).message}`);
    });

    return `Spinning up a room of ${count} on "${input.topic}" in ${project.id} — they're coordinating in the channel now.`;
  }

  /** Ensure the channel key is unique even if two topics sanitize the same. */
  private uniqueChannel(topic: string): string {
    let base = channelName(topic);
    let candidate = base;
    let i = 2;
    while (this.rooms.has(candidate)) candidate = `${base}-${i++}`;
    return candidate;
  }

  private async launchRoom(room: Room, names: string[]): Promise<void> {
    fs.mkdirSync(room.workspace, { recursive: true });
    await kanbanChannelCreate(room.channel);
    // Bring the board forward on this channel so the room is the centre of
    // attention as the agents pour in.
    void desktop().focusChannel(room.channel);

    if (config.fleetDryRun) {
      for (const agent of room.agents.values()) {
        agent.status = "working";
        agent.lastActivity = "dry-run (no agent launched)";
      }
      this.emitFleet();
      return;
    }

    await Promise.all(names.map((name) => this.launchAgent(room, name, names)));

    // Max drops the mission into the room himself, so the team has a north
    // star pinned at the top of the channel.
    await this.broadcastMission(room, room.mission, "MISSION");
    // Bring the board back to the front on this channel now that the terminals
    // have popped — it's the room's focal point: the agents chatting live.
    void desktop().focusChannel(room.channel);
    this.startWatcher();
  }

  private async launchAgent(room: Room, name: string, teammates: string[]): Promise<void> {
    const agent = room.agents.get(name);
    if (!agent) return;
    // add_agents reaches launchAgent directly (not just through launchRoom), so
    // the dry-run short-circuit lives here too — otherwise headless tests of
    // the add-to-a-live-room path would shell out and spawn real claude agents.
    if (config.fleetDryRun) {
      agent.status = "working";
      agent.lastActivity = "dry-run (no agent launched)";
      this.emitFleet();
      return;
    }
    try {
      const result = await kanbanLaunch(agent.slug, room.workspace, config.agentModel);
      agent.tmuxName = result.tmuxName;
      void desktop().openTerminal({
        command: `tmux attach -t ${result.tmuxName}`,
        title: agent.slug,
        key: agent.slug,
        slot: terminalSlotForIndex(this.terminalCount++),
      });
      // claude needs a beat after launch before the prompt lands reliably.
      await new Promise((r) => setTimeout(r, 6000));
      await kanbanSend(result.tmuxName, agentPrompt(room, name, teammates));
      agent.status = "working";
      agent.lastActivity = "joined the channel";
    } catch (err) {
      agent.status = "gone";
      agent.lastActivity = `launch failed: ${(err as Error).message}`;
      log("room", `launch ${name} failed: ${(err as Error).message}`);
    }
    this.emitFleet();
  }

  /** Speak into an existing room as Max. Returns a spoken ack. */
  messageRoom(input: { topic: string; message: string }): string {
    const room = this.findRoom(input.topic);
    if (!room) {
      return `No room running for "${input.topic}" yet — say the word and I'll spin one up.`;
    }
    void this.broadcastMission(room, input.message, "FROM THE ROOM");
    return `Passed it to the ${room.agents.size} agents on "${room.topic}".`;
  }

  /** Add more agents to a room already in flight. */
  addAgents(input: { topic: string; count?: number }): string {
    const room = this.findRoom(input.topic);
    if (!room) {
      return `No room running for "${input.topic}" yet — I'll start one instead if you want.`;
    }
    const count = Math.max(1, Math.min(MAX_AGENTS, Math.round(input.count ?? 1)));
    const names = this.takeNames(count);
    const teammates = [...room.agents.keys(), ...names];
    for (const name of names) {
      const slug = `${config.fleetPrefix}${name}`;
      room.agents.set(name, {
        slug,
        tmuxName: slug,
        name,
        channel: room.channel,
        topic: room.topic,
        mission: room.mission,
        workspace: room.workspace,
        status: "launching",
        lastActivity: "spinning up",
        launchedAt: Date.now(),
      });
    }
    this.emitFleet();
    void desktop().focusChannel(room.channel);
    void Promise.all(names.map((name) => this.launchAgent(room, name, teammates))).catch(
      (err) => log("room", `add agents failed: ${(err as Error).message}`),
    );
    return `Adding ${count} more to "${room.topic}" — ${room.agents.size} agents on it now.`;
  }

  private async broadcastMission(room: Room, body: string, tag: string): Promise<void> {
    try {
      await kanbanChannelSend(room.channel, `[${tag}] ${body}`, MAX_HANDLE);
    } catch (err) {
      log("room", `channel send failed: ${(err as Error).message}`);
    }
  }

  /** Instant, no LLM: a report composed from room state + channel history. */
  async progressReport(scope?: string): Promise<string> {
    if (this.rooms.size === 0) return "No rooms running yet — nothing dispatched.";
    const rooms = scope && scope !== "all"
      ? [this.findRoom(scope)].filter((r): r is Room => Boolean(r))
      : [...this.rooms.values()];
    if (rooms.length === 0) return `No room running for "${scope}".`;

    const parts: string[] = [];
    for (const room of rooms) {
      const live = [...room.agents.values()].filter((a) => a.status !== "gone").length;
      const history = await kanbanChannelHistory(room.channel, 6);
      const lastLines = history
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(-4)
        .join("\n");
      parts.push(
        `Room "${room.topic}" (${live} agents in #${room.channel}):\n${lastLines || "  (no chatter yet)"}`,
      );
    }
    return parts.join("\n\n");
  }

  async kill(topic: string): Promise<void> {
    const room = this.findRoom(topic);
    if (!room) return;
    for (const agent of room.agents.values()) {
      await kanbanKill(agent.tmuxName);
      this.usedNames.delete(agent.name);
    }
    this.rooms.delete(room.channel);
    this.emitFleet();
  }

  startWatcher(intervalMs = 6000): void {
    if (this.watcher) return;
    this.watcher = setInterval(() => void this.poll(), intervalMs);
  }

  stopWatcher(): void {
    if (this.watcher) clearInterval(this.watcher);
    this.watcher = null;
  }

  /** Liveness + proactive completion, drawn from tmux panes and the channel. */
  private async poll(): Promise<void> {
    let changed = false;
    for (const room of this.rooms.values()) {
      const history = await kanbanChannelHistory(room.channel, 12);
      const prUrl = history.match(/https?:\/\/github\.com\/\S+\/pull\/\d+/)?.[0];
      for (const agent of room.agents.values()) {
        if (agent.status === "launching") continue;
        try {
          const capture = await kanbanCapture(agent.tmuxName);
          const newStatus = /esc to interrupt/i.test(capture) ? "working" : "idle";
          if (newStatus !== agent.status) {
            agent.status = newStatus;
            changed = true;
          }
        } catch {
          if (agent.status !== "gone") {
            agent.status = "gone";
            changed = true;
          }
        }
      }
      if (prUrl) this.announceDone(room, prUrl);
    }
    if (changed) this.emitFleet();
  }

  /** Proactive: when a PR link shows up in a room's channel, pop it. */
  private announceDone(room: Room, prUrl: string): void {
    if (this.announcedDone.has(room.channel)) return;
    this.announcedDone.add(room.channel);
    log("room", `${room.topic} produced a PR — ${prUrl}`);
    void desktop().notify({
      title: `✅ ${room.topic}`,
      message: `The room shipped a PR.`,
      openUrl: prUrl,
    });
    void desktop().openBrowser({ url: prUrl, key: `pr-${room.channel}`, slot: "top-left" });
    this.emit("done", { topic: room.topic, prUrl });
  }

  private emitFleet(): void {
    this.emit("fleet", this.list());
  }
}

function agentPrompt(room: Room, name: string, teammates: string[]): string {
  return buildAgentBrief({
    name,
    teammates,
    mission: room.mission,
    channel: room.channel,
    workspace: room.workspace,
    liveUrl:
      room.project.url && room.project.url.startsWith("http://")
        ? room.project.url
        : undefined,
  });
}

export const rooms = new RoomManager();
