/**
 * Network-free unit tests for the room engine's pure core: how a spoken hint
 * resolves to a project, how a topic becomes a channel name, and the
 * coordinate-first brief every agent receives. These run everywhere (CI
 * included) — no kanban CLI, no tmux, no APIs.
 */
import { describe, expect, it } from "vitest";
import { channelName, buildAgentBrief } from "../src/orchestrator/room.js";
import { resolveProject, DEFAULT_PROJECT_ID } from "../src/orchestrator/projects.js";
import { resolveOpenUrl } from "../src/tools/handlers.js";

describe("topic → channel name", () => {
  it("lowercases, dashes, and trims", () => {
    expect(channelName("Full Dark Mode")).toBe("full-dark-mode");
    expect(channelName("  Login   Fix!! ")).toBe("login-fix");
  });
  it("never produces an empty or invalid name", () => {
    expect(channelName("")).toBe("room");
    expect(channelName("!!!")).toBe("room");
    expect(channelName("dark mode")).toMatch(/^[a-z0-9][a-z0-9_-]*$/);
  });
});

describe("project resolution (deterministic, no LLM)", () => {
  it("maps spoken hints to the website checkout", () => {
    expect(resolveProject("get five agents on the website").id).toBe("website");
    expect(resolveProject("make the landing page dark").id).toBe("website");
  });
  it("maps langwatch hints to the langwatch repo", () => {
    expect(resolveProject("fix the issue on langwatch").id).toBe("langwatch");
  });
  it("prefers the longest matching alias", () => {
    // "langwatch website" should land on the website, not the bare langwatch.
    expect(resolveProject("pull up the langwatch website").id).toBe("website");
  });
  it("falls back to the default project when nothing matches", () => {
    expect(resolveProject("do the thing").id).toBe(DEFAULT_PROJECT_ID);
    expect(resolveProject(undefined).id).toBe(DEFAULT_PROJECT_ID);
  });
});

describe("coordinate-first agent brief (the delegation contract)", () => {
  const brief = buildAgentBrief({
    name: "aria",
    teammates: ["aria", "bolt", "cleo"],
    mission: "ship a full dark mode",
    channel: "full-dark-mode",
    workspace: "/tmp/site",
    liveUrl: "http://127.0.0.1:5173",
  });

  it("names the agent and its teammates", () => {
    expect(brief).toContain("You are aria");
    expect(brief).toContain("bolt");
    expect(brief).toContain("cleo");
    expect(brief).not.toMatch(/teammates:.*aria/); // self excluded from the list
  });
  it("carries the mission", () => {
    expect(brief).toContain("ship a full dark mode");
  });
  it("tells the agent to JOIN the channel before building", () => {
    const joinAt = brief.indexOf(`kanban channel join full-dark-mode`);
    const buildAt = brief.indexOf("Build it");
    expect(joinAt).toBeGreaterThan(-1);
    expect(buildAt).toBeGreaterThan(joinAt); // join precedes build
  });
  it("tells the agent to coordinate in the channel", () => {
    expect(brief.toLowerCase()).toContain("coordinate");
    expect(brief).toContain("review their work");
    expect(brief).toContain("never edit a file someone already claimed");
  });
  it("warns not to restart a running dev server when one is live", () => {
    expect(brief).toContain("do NOT start or restart it");
    expect(brief).toContain("http://127.0.0.1:5173");
  });
  it("omits the dev-server note when there is no live url", () => {
    const noServer = buildAgentBrief({
      name: "solo",
      teammates: ["solo"],
      mission: "research the market",
      channel: "market",
      workspace: "/tmp/x",
    });
    expect(noServer).not.toContain("dev server is already running");
    expect(noServer).toContain("(solo for now)");
  });
});

describe("open_url resolution", () => {
  it("trusts a real remote URL exactly (e.g. a GitHub issue)", () => {
    const issue = "https://github.com/langwatch/langwatch/issues/1234";
    expect(resolveOpenUrl(issue)).toBe(issue);
  });
  it("maps a bare 'the website' phrase to the running site", () => {
    expect(resolveOpenUrl("the website")).toMatch(/^https?:\/\/(127\.0\.0\.1|localhost):\d+/);
  });
  it("rewrites a localhost guess (invented dev port) to the real site", () => {
    // The model loves to guess localhost:3000 — it must still land on the site.
    expect(resolveOpenUrl("http://localhost:3000")).toMatch(/:\d+/);
    expect(resolveOpenUrl("http://localhost:3000")).not.toContain(":3000");
  });
  it("adds a scheme to a real partial domain", () => {
    expect(resolveOpenUrl("example.com/path")).toBe("https://example.com/path");
  });
});
