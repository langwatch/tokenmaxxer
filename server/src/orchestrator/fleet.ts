import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { desktop, prSlot, terminalSlotForIndex } from "../desktop/index.js";
import type { FleetAgentView } from "../events.js";
import { log } from "../log.js";
import { decideDispatch } from "./brain.js";
import {
  kanbanCapture,
  kanbanKill,
  kanbanLaunch,
  kanbanSend,
  looksBusy,
} from "./kanban.js";

interface FleetAgent extends FleetAgentView {
  tmuxName: string;
}

function workerPromptWrapper(workerPrompt: string, workspace: string): string {
  const playgroundNote =
    workspace === config.playgroundDir
      ? "Your workspace is the LIVE prototype site projected on the meeting room screen (vite + react + tailwind). Pages live in src/pages/<slug>.tsx, one file per page, default export, routing is automatic. The dev server is already running — do NOT start or restart it; HMR shows your edits live. Match the dark zinc + violet aesthetic of existing pages."
      : "Your workspace is a fresh directory. Set up whatever you need.";

  return [
    "You are a worker agent in the tokenmaxxer fleet — a meeting room's unlimited background compute. Work autonomously start to finish. Never ask questions; make the call yourself. Be fast: a good result in minutes beats a perfect one in an hour.",
    "",
    playgroundNote,
    "",
    "Keep a STATUS.md at the workspace root. One line per update, newest FIRST, format: `- [HH:MM] <what you are doing / found / finished>`. Update it every time you complete a step — the meeting room reads it live. When the mission is complete, the top line must start with `- [HH:MM] DONE:` followed by a one-sentence result.",
    "",
    "MISSION:",
    workerPrompt,
  ].join("\n");
}

/**
 * The fleet: long-lived Claude Code agents in tmux, commanded through the
 * kanban CLI. Dispatch is fire-and-forget — the voice layer gets an ack in
 * milliseconds while routing, launching and prompting happen here.
 */
export class FleetManager extends EventEmitter {
  private agents = new Map<string, FleetAgent>();
  private watcher: NodeJS.Timeout | null = null;
  /** Assigns each visible agent terminal a fan-out quadrant. */
  private terminalCount = 0;
  /** Agents whose completion has already been surfaced proactively. */
  private announcedDone = new Set<string>();

  list(): FleetAgentView[] {
    return [...this.agents.values()].map(({ tmuxName: _t, ...view }) => view);
  }

  /** Returns immediately; the routing decision and launch run in background. */
  dispatch(mission: string, topic: string): string {
    const related = this.findByTopic(topic);
    if (!related) {
      // The room screen shows the agent the instant the words are spoken;
      // the brain confirms or renames it a few seconds later.
      const provisionalSlug = `${config.fleetPrefix}${topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`.slice(0, 40);
      if (!this.agents.has(provisionalSlug)) {
        this.agents.set(provisionalSlug, {
          slug: provisionalSlug,
          tmuxName: provisionalSlug,
          topic,
          mission,
          workspace: "",
          status: "launching",
          lastActivity: "routing mission",
          launchedAt: Date.now(),
        });
        this.emitFleet();
      }
    }
    void this.route(mission, topic).catch((err) => {
      log("fleet", `dispatch failed: ${(err as Error).message}`);
      this.emitFleet();
    });
    return related
      ? `Dispatched as follow-up to agent "${related.slug}" already on "${related.topic}".`
      : `Dispatched. A new agent is spinning up for "${topic}".`;
  }

  private findByTopic(topic: string): FleetAgent | undefined {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return [...this.agents.values()].find(
      (a) => a.status !== "gone" && norm(a.topic) === norm(topic),
    );
  }

  private async route(mission: string, topic: string): Promise<void> {
    // Provisional entries and dead agents are not reuse candidates.
    const decision = await decideDispatch(
      mission,
      topic,
      this.list().filter(
        (a) => a.lastActivity !== "routing mission" && a.status !== "gone",
      ),
    );
    log("fleet", `brain: ${decision.action} ${decision.slug} in ${decision.workspace}`);

    // The provisional entry served its purpose; the decision replaces it.
    const provisionalSlug = `${config.fleetPrefix}${topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`.slice(0, 40);
    const provisional = this.agents.get(provisionalSlug);
    if (provisional && provisional.lastActivity === "routing mission") {
      this.agents.delete(provisionalSlug);
    }

    const reuseTarget =
      decision.action === "reuse" ? this.agents.get(decision.slug) : undefined;
    const existing =
      reuseTarget && reuseTarget.status !== "gone" ? reuseTarget : undefined;
    if (existing) {
      existing.mission = mission;
      existing.status = "working";
      existing.lastActivity = "received new direction";
      this.emitFleet();
      await kanbanSend(
        existing.tmuxName,
        `NEW DIRECTION from the meeting (same mission, course-correct): ${decision.worker_prompt}`,
      );
      return;
    }

    const slug = `${config.fleetPrefix}${decision.slug}`.slice(0, 40);
    const workspace =
      decision.workspace === "playground"
        ? config.playgroundDir
        : path.join(config.workspacesDir, decision.slug);
    fs.mkdirSync(workspace, { recursive: true });

    const agent: FleetAgent = {
      slug,
      tmuxName: slug,
      topic,
      mission,
      workspace,
      status: "launching",
      lastActivity: "launching",
      launchedAt: Date.now(),
    };
    this.agents.set(slug, agent);
    this.emitFleet();

    if (config.fleetDryRun) {
      agent.status = "working";
      agent.lastActivity = "dry-run (no agent launched)";
      this.emitFleet();
      return;
    }

    const result = await kanbanLaunch(slug, workspace, config.agentModel);
    agent.tmuxName = result.tmuxName;
    // Pop a real terminal so the room watches the agent work live.
    void desktop().openTerminal({
      command: `tmux attach -t ${result.tmuxName}`,
      title: slug,
      key: slug,
      slot: terminalSlotForIndex(this.terminalCount++),
    });
    // claude needs a beat after launch before the prompt lands reliably
    await new Promise((r) => setTimeout(r, 6000));
    await kanbanSend(
      result.tmuxName,
      workerPromptWrapper(decision.worker_prompt, workspace),
    );
    agent.status = "working";
    agent.lastActivity = "mission delivered";
    this.emitFleet();
  }

  /** Instant, no LLM: status report composed from fleet state + STATUS.md. */
  progressReport(): string {
    if (this.agents.size === 0) {
      return "Fleet is empty — nothing dispatched yet.";
    }
    const lines = [...this.agents.values()].map((a) => {
      const mins = Math.round((Date.now() - a.launchedAt) / 60000);
      return `${a.slug} (${a.topic}, ${a.status}, ${mins}m): ${a.lastActivity}`;
    });
    return lines.join("\n");
  }

  async kill(slug: string): Promise<void> {
    const agent = this.agents.get(slug);
    if (!agent) return;
    await kanbanKill(agent.tmuxName);
    agent.status = "gone";
    this.emitFleet();
    this.agents.delete(slug);
  }

  startWatcher(intervalMs = 5000): void {
    if (this.watcher) return;
    this.watcher = setInterval(() => void this.poll(), intervalMs);
  }

  stopWatcher(): void {
    if (this.watcher) clearInterval(this.watcher);
    this.watcher = null;
  }

  private async poll(): Promise<void> {
    let changed = false;
    for (const agent of this.agents.values()) {
      if (agent.status === "launching") continue;
      try {
        const status = readStatusFile(agent.workspace);
        if (status && status !== agent.lastActivity) {
          agent.lastActivity = status;
          changed = true;
        }
        const capture = await kanbanCapture(agent.tmuxName);
        const busy = looksBusy(capture);
        const newStatus = status?.startsWith("DONE:")
          ? "idle"
          : busy
            ? "working"
            : "idle";
        if (newStatus !== agent.status) {
          agent.status = newStatus;
          changed = true;
        }
        if (status?.startsWith("DONE:")) this.announceDone(agent, status);
      } catch {
        if (agent.status !== "gone") {
          agent.status = "gone";
          changed = true;
        }
      }
    }
    if (changed) this.emitFleet();
  }

  /**
   * Proactive completion — fired once per agent, even in silence. Posts a
   * desktop notification and, when the work produced a pull request, pops it
   * open on the room screen.
   */
  private announceDone(agent: FleetAgent, status: string): void {
    if (this.announcedDone.has(agent.slug)) return;
    this.announcedDone.add(agent.slug);
    const summary = status.replace(/^DONE:\s*/, "").slice(0, 180);
    const prUrl = status.match(/https?:\/\/github\.com\/\S+\/pull\/\d+/)?.[0];
    log("fleet", `${agent.slug} DONE — ${summary}`);
    void desktop().notify({
      title: `✅ ${agent.topic}`,
      message: summary,
      openUrl: prUrl,
    });
    if (prUrl) {
      void desktop().openBrowser({
        url: prUrl,
        key: `pr-${agent.slug}`,
        slot: prSlot(),
      });
    }
    this.emit("done", { slug: agent.slug, summary, prUrl });
  }

  private emitFleet(): void {
    this.emit("fleet", this.list());
  }
}

function readStatusFile(workspace: string): string | null {
  try {
    const content = fs.readFileSync(path.join(workspace, "STATUS.md"), "utf8");
    const line = content
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("- "));
    if (!line) return null;
    return line.replace(/^- \[[^\]]*\]\s*/, "").slice(0, 200);
  } catch {
    return null;
  }
}

export const fleet = new FleetManager();
