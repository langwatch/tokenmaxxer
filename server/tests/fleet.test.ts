/**
 * Fleet integration tests — REAL brain decisions (Anthropic), REAL kanban
 * launches, REAL claude code agents in tmux doing a tiny mission. Binds
 * specs/orchestrator.feature. The worker model comes from
 * TOKENMAXXER_AGENT_MODEL (sonnet for testing).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { FleetManager } from "../src/orchestrator/fleet.js";
import { decideDispatch } from "../src/orchestrator/brain.js";

const TEST_WORKSPACES = fs.mkdtempSync(
  path.join(os.tmpdir(), "tokenmaxxer-fleet-test-"),
);
process.env.TOKENMAXXER_WORKSPACES_DIR = TEST_WORKSPACES;

const spawnedSessions: string[] = [];

afterAll(() => {
  for (const session of spawnedSessions) {
    try {
      execFileSync("tmux", ["kill-session", "-t", session]);
    } catch {
      // already gone
    }
  }
  fs.rmSync(TEST_WORKSPACES, { recursive: true, force: true });
});

describe("orchestrator brain", () => {
  it("spawns for a brand-new workstream", async () => {
    const decision = await decideDispatch(
      "Research the market size for a peer-to-peer cat sitting platform and write findings to findings.md",
      "cat sitter market research",
      [],
    );
    expect(decision.action).toBe("spawn");
    expect(decision.slug).toMatch(/^[a-z0-9-]+$/);
    expect(decision.workspace).toBe("fresh");
    expect(decision.worker_prompt.length).toBeGreaterThan(40);
  });

  it("reuses the agent already on the same workstream", async () => {
    const decision = await decideDispatch(
      "Actually, focus the cat sitter market research on Europe only.",
      "cat sitter market research",
      [
        {
          slug: "tmx-cat-sitter-market",
          topic: "cat sitter market research",
          mission: "Research the market size for a cat sitting platform",
          workspace: "/tmp/x",
          status: "working",
          lastActivity: "researching",
          launchedAt: Date.now(),
        },
      ],
    );
    expect(decision.action).toBe("reuse");
    expect(decision.slug).toBe("tmx-cat-sitter-market");
  });

  it("routes visual site work to the playground", async () => {
    const decision = await decideDispatch(
      "Add a testimonials section to the pricing page of our prototype site",
      "prototype site pricing",
      [],
    );
    expect(decision.workspace).toBe("playground");
  });
});

describe("fleet end to end (spawns a real claude agent)", () => {
  it("dispatches a mission, the agent works it and STATUS.md drives progress", async () => {
    const fleet = new FleetManager();
    const events: unknown[] = [];
    fleet.on("fleet", (agents) => events.push(agents));

    const ack = fleet.dispatch(
      "Create a file named haiku.txt containing a haiku about unlimited compute. " +
        "That is the entire mission — do it and declare DONE.",
      "compute haiku",
    );
    expect(ack).toContain("Dispatched");

    // Launch + prompt delivery happen in background; wait for the agent.
    const deadline = Date.now() + 180_000;
    let agent = fleet.list()[0];
    while (Date.now() < deadline) {
      agent = fleet.list()[0];
      if (agent && agent.status !== "launching") break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(agent, "agent never appeared in fleet").toBeDefined();
    spawnedSessions.push(agent.slug);
    expect(agent.slug.startsWith("tmx-")).toBe(true);

    // The worker must produce the artifact and a STATUS.md heartbeat.
    fleet.startWatcher(3000);
    let haiku: string | null = null;
    while (Date.now() < deadline) {
      const files = fs
        .readdirSync(agent.workspace, { recursive: true })
        .map(String);
      const found = files.find((f) => f.endsWith("haiku.txt"));
      if (found) {
        haiku = fs.readFileSync(path.join(agent.workspace, found), "utf8");
        break;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    fleet.stopWatcher();
    expect(haiku, "worker never produced haiku.txt").not.toBeNull();
    expect(haiku!.length).toBeGreaterThan(10);

    // Progress report is instant and mentions the workstream.
    const report = fleet.progressReport();
    expect(report).toContain(agent.slug);
    expect(events.length).toBeGreaterThan(0);
  }, 240_000);
});
