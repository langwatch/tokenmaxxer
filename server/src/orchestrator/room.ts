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
  kanbanChannelDelete,
  kanbanChannelHistory,
  kanbanChannelJoinAs,
  kanbanChannelMembers,
  kanbanChannelSend,
  kanbanKill,
  kanbanLaunch,
  kanbanSend,
  listTmuxSessions,
  waitForClaudeReady,
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
  /** Names handed out this fleet's life — never recycled until the fleet fully
   *  drains, so two rooms can't share an agent slug (and so a sessionId). */
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

  /**
   * Hand out distinct agent names, monotonically. A name is taken only if it's
   * neither already in use NOR backed by a live tmux session, and names are NOT
   * recycled when a single room closes — only when the whole fleet drains (in
   * kill()). This is what stops two rooms from deriving the same tmux slug, and
   * so the same deterministic sessionId, which made the second room resume the
   * first room's claude under a new mission. The live-session check also covers
   * survivors of a gateway restart (the in-memory set is cleared but the tmux
   * sessions keep running).
   */
  private async takeNames(count: number): Promise<string[]> {
    const live = await listTmuxSessions();
    const taken = (n: string) =>
      this.usedNames.has(n) || live.has(`${config.fleetPrefix}${n}`);
    const picked: string[] = [];
    for (let i = 0; i < count; i++) {
      let name = NAME_POOL.find((n) => !taken(n));
      if (!name) {
        // Pool exhausted for this fleet's life: a numbered name that is itself
        // free and not live.
        let n = 1;
        while (taken(`agent-${n}`)) n++;
        name = `agent-${n}`;
      }
      this.usedNames.add(name);
      picked.push(name);
    }
    return picked;
  }

  /**
   * Whether a room found in memory is still actually live. An out-of-band
   * teardown (the reset script) kills the tmux sessions and deletes the channel
   * but can't touch this process's `rooms` map, leaving a stale entry that would
   * otherwise swallow a fresh spawn of the same topic. A room counts as live
   * only if its channel still exists OR an agent's tmux session is still up.
   */
  private async roomStillExists(room: Room): Promise<boolean> {
    if ((await kanbanChannelMembers(room.channel)).length > 0) return true;
    const live = await listTmuxSessions();
    return [...room.agents.values()].some(
      (a) => live.has(a.tmuxName) || live.has(a.slug),
    );
  }

  /**
   * Forget a stale room (torn down out of band): drop it from the map and free
   * its agent names, so a fresh spawn of the same topic recycles them.
   */
  private dropRoom(room: Room): void {
    for (const agent of room.agents.values()) this.usedNames.delete(agent.name);
    this.rooms.delete(room.channel);
    this.announcedDone.delete(room.channel);
    if (this.rooms.size === 0) this.terminalCount = 0;
  }

  /**
   * Spin up a brand-new room. Returns immediately with a spoken-friendly ack;
   * channel creation, agent launches, terminal pops and app focus all run in
   * the background.
   */
  async spawnRoom(input: {
    mission: string;
    topic: string;
    agents?: number;
    project?: string;
  }): Promise<string> {
    const count = Math.max(1, Math.min(MAX_AGENTS, Math.round(input.agents ?? DEFAULT_AGENTS)));
    const existing = this.findRoom(input.topic);
    if (existing && (await this.roomStillExists(existing))) {
      // Same topic, fresh direction: speak into the room instead of forking it.
      void this.broadcastMission(existing, input.mission, "NEW DIRECTION from the room");
      return `That room's already live — passing it along to the ${existing.agents.size} agents on "${existing.topic}".`;
    }
    // A stale entry left by an out-of-band teardown (reset kills tmux + deletes
    // the channel but can't reach this process's memory): forget it and spin a
    // genuinely fresh room below instead of broadcasting into a dead channel.
    if (existing) this.dropRoom(existing);

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
    const names = await this.takeNames(count);
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
    // Max pins the mission FIRST, so it's already in the channel history each
    // agent reads when it joins.
    await this.broadcastMission(room, room.mission, "MISSION");
    await this.launchAgents(room, names, names);
    this.startWatcher();
  }

  /**
   * Launch a set of agents reliably, in two phases. Phase 1 creates every
   * tmux session ONE AT A TIME — parallel `kanban launch` calls race and can
   * collapse two agents onto a single card, so only some ever join. Phase 2
   * delivers each mission as that agent's claude becomes ready; the slow cold
   * boots overlap, so this stays fast without re-introducing the race.
   */
  private async launchAgents(
    room: Room,
    names: string[],
    teammates: string[],
  ): Promise<void> {
    if (config.fleetDryRun) {
      for (const name of names) {
        const agent = room.agents.get(name);
        if (agent) {
          agent.status = "working";
          agent.lastActivity = "dry-run (no agent launched)";
        }
      }
      this.emitFleet();
      return;
    }
    // Phase 1: create each session, force-join the channel, pop its terminal —
    // sequential so the kanban CLI launches don't race.
    const terminalOpens: Promise<void>[] = [];
    const launched: string[] = [];
    for (const name of names) {
      if (await this.launchSession(room, name, terminalOpens)) launched.push(name);
    }
    // Once the terminals have finished drawing, raise the board ON TOP of them
    // (and the team's own windows). This must be awaited and last — a `void`
    // raise races the terminal pops and loses, leaving the board buried.
    await Promise.allSettled(terminalOpens);
    await desktop().focusChannel(room.channel);
    // Phase 2: deliver missions in the background. No window ops here, so the
    // board stays on top while claude boots.
    void Promise.all(
      launched.map((name) => this.deliverMission(room, name, teammates)),
    ).catch((err) => log("room", `deliver failed: ${(err as Error).message}`));
  }

  /** Phase 1: create the tmux session, force-join the channel, pop the terminal. */
  private async launchSession(
    room: Room,
    name: string,
    terminalOpens: Promise<void>[],
  ): Promise<boolean> {
    const agent = room.agents.get(name);
    if (!agent) return false;
    try {
      const result = await kanbanLaunch(agent.slug, room.workspace, config.agentModel);
      agent.tmuxName = result.tmuxName;
      // Force the agent into the channel by its card identity now, so the swarm
      // is visible regardless of whether claude later runs `kanban channel join`
      // itself (it tends to dive into the mission and skip it). The card link
      // means the agent still receives the channel's broadcasts in its pane.
      if (result.card?.id) {
        try {
          await kanbanChannelJoinAs(room.channel, agentHandle(agent.slug), result.card.id);
          agent.lastActivity = "joined the channel";
        } catch (err) {
          log("room", `force-join ${name} failed: ${(err as Error).message}`);
        }
      }
      // Collected so the board raise can wait for every terminal to settle.
      terminalOpens.push(
        desktop()
          .openTerminal({
            command: `tmux attach -t ${result.tmuxName}`,
            title: agent.slug,
            key: agent.slug,
            slot: terminalSlotForIndex(this.terminalCount++),
          })
          .catch(() => {}),
      );
      return true;
    } catch (err) {
      agent.status = "gone";
      agent.lastActivity = `launch failed: ${(err as Error).message}`;
      log("room", `launch ${name} failed: ${(err as Error).message}`);
      this.emitFleet();
      return false;
    }
  }

  /**
   * Phase 2: once claude's REPL is drawn, hand it the mission ONCE. Membership
   * is already guaranteed by the force-join in phase 1, so there's nothing to
   * confirm or re-send here — re-sending only piled up queued prompts and
   * confused a busy agent. If the keystrokes are somehow missed, the agent
   * still sees the mission Max pinned in the channel it was joined to.
   */
  private async deliverMission(
    room: Room,
    name: string,
    teammates: string[],
  ): Promise<void> {
    const agent = room.agents.get(name);
    if (!agent) return;
    try {
      await waitForClaudeReady(agent.tmuxName, 60_000);
      await kanbanSend(agent.tmuxName, agentPrompt(room, name, teammates));
      agent.status = "working";
      agent.lastActivity = "on the mission";
    } catch (err) {
      agent.status = "gone";
      agent.lastActivity = `mission delivery failed: ${(err as Error).message}`;
      log("room", `deliver ${name} failed: ${(err as Error).message}`);
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
  async addAgents(input: { topic: string; count?: number }): Promise<string> {
    const room = this.findRoom(input.topic);
    if (!room) {
      return `No room running for "${input.topic}" yet — I'll start one instead if you want.`;
    }
    const count = Math.max(1, Math.min(MAX_AGENTS, Math.round(input.count ?? 1)));
    const names = await this.takeNames(count);
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
    void this.launchAgents(room, names, teammates).catch((err) =>
      log("room", `add agents failed: ${(err as Error).message}`),
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

  /** Tear a room down by voice: kill its agents and delete its channel. */
  closeRoom(topic: string): string {
    const room = this.findRoom(topic);
    if (!room) return `No room running for "${topic}" — nothing to close.`;
    const count = room.agents.size;
    const label = room.topic;
    void this.kill(label).catch((err) =>
      log("room", `close ${label} failed: ${(err as Error).message}`),
    );
    return `Shutting down the "${label}" room — killing ${count} agent${count === 1 ? "" : "s"}.`;
  }

  async kill(topic: string): Promise<void> {
    const room = this.findRoom(topic);
    if (!room) return;
    for (const agent of room.agents.values()) {
      // Really terminate the session (same call as scripts/reset-rooms.ts): a
      // survivor would be silently resumed by the next room that reuses the
      // name. Kill both the launch-reported name and the deterministic slug, in
      // case they ever differ.
      await kanbanKill(agent.tmuxName);
      if (agent.slug !== agent.tmuxName) await kanbanKill(agent.slug);
      // Close the leftover terminal window too, so "kill the room" clears the
      // dead `tmux attach … [exited]` pane instead of leaving it on screen.
      await desktop().closeWindow(agent.slug).catch(() => {});
      // The name is NOT recycled here — only on full drain (below). Its slug,
      // and so its sessionId, is deterministic, so reusing it while any room
      // still runs could resume a half-dead session.
    }
    await kanbanChannelDelete(room.channel);
    this.rooms.delete(room.channel);
    this.announcedDone.delete(room.channel);
    // Whole fleet drained: now it's safe to recycle names + terminal slots, so
    // the next run reads aria/bolt/cleo again from a clean slate.
    if (this.rooms.size === 0) {
      this.usedNames.clear();
      this.terminalCount = 0;
    }
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

/** The channel handle for a launch slug: "tmx-aria" -> "tmx_aria". */
function agentHandle(slug: string): string {
  return slug.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
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
