/**
 * The deterministic intent safety net, checked against the exact delegation
 * eval dataset (scripts/experiment-delegation.ts). gemma-4 routes these by
 * salient words; the corrector must turn every steer/status/show utterance
 * into the right tool, AND must NOT touch the spawn_room work requests (it
 * returns null there so the model — which nails them — decides). Network-free.
 */
import { describe, expect, it } from "vitest";
import { correctIntent } from "../src/tools/intent.js";

describe("intent corrector — the steer/status/show cases gemma fumbles", () => {
  it("'how's it going in the dark mode room?' -> check_progress", () => {
    const r = correctIntent("How's it going in the dark mode room?");
    expect(r?.tool).toBe("check_progress");
    expect(r?.args.scope).toBe("dark mode");
  });
  it("'what's everyone working on right now?' -> check_progress (all)", () => {
    const r = correctIntent("What's everyone working on right now?");
    expect(r?.tool).toBe("check_progress");
    expect(r?.args.scope).toBe("all");
  });
  it("'give me a quick status on the rooms' -> check_progress", () => {
    expect(correctIntent("Give me a quick status on the rooms.")?.tool).toBe("check_progress");
  });

  it("'throw two more agents at the dark mode room' -> add_agents x2", () => {
    const r = correctIntent("Throw two more agents at the dark mode room.");
    expect(r?.tool).toBe("add_agents");
    expect(r?.args.topic).toBe("dark mode");
    expect(r?.args.count).toBe(2);
  });
  it("'double the team on the login fix' -> add_agents on login", () => {
    const r = correctIntent("Double the team on the login fix.");
    expect(r?.tool).toBe("add_agents");
    expect(r?.args.topic).toBe("login");
    expect(r?.args.count).toBe(2);
  });

  it("'tell the dark mode room to keep the logo readable' -> message_room", () => {
    const r = correctIntent("Tell the dark mode room to keep the logo readable on black.");
    expect(r?.tool).toBe("message_room");
    expect(r?.args.topic).toBe("dark mode");
    expect(r?.args.message).toBe("keep the logo readable on black");
  });
  it("'remind the login room to write tests as they go' -> message_room", () => {
    const r = correctIntent("Remind the login room to write tests as they go.");
    expect(r?.tool).toBe("message_room");
    expect(r?.args.topic).toBe("login");
    expect(r?.args.message).toBe("write tests as they go");
  });

  it("'show me the langwatch repo' -> open_url (langwatch)", () => {
    const r = correctIntent("Show me the langwatch repo.");
    expect(r?.tool).toBe("open_url");
    expect(r?.args.url).toBe("langwatch");
  });
  it("'put the live site on the screen for everyone' -> open_url (the website)", () => {
    const r = correctIntent("Put the live site on the screen for everyone.");
    expect(r?.tool).toBe("open_url");
    expect(r?.args.url).toBe("the website");
  });
  it("'pull up the new website on the screen' -> open_url", () => {
    expect(correctIntent("Pull up the new website on the screen.")?.tool).toBe("open_url");
  });
  it("'open issue 1234 on langwatch' -> open_url with the issue URL", () => {
    const r = correctIntent("Open issue 1234 on langwatch.");
    expect(r?.tool).toBe("open_url");
    expect(r?.args.url).toBe("https://github.com/langwatch/langwatch/issues/1234");
  });
});

describe("intent corrector — tearing a room down", () => {
  it("'kill the dark mode room' -> close_room on dark mode", () => {
    const r = correctIntent("Kill the dark mode room.");
    expect(r?.tool).toBe("close_room");
    expect(r?.args.topic).toBe("dark mode");
  });
  it("'shut down the login room' -> close_room on login", () => {
    const r = correctIntent("Shut down the login room.");
    expect(r?.tool).toBe("close_room");
    expect(r?.args.topic).toBe("login");
  });
  it("'stop the agents on dark mode' -> close_room", () => {
    expect(correctIntent("Stop the agents on dark mode.")?.tool).toBe("close_room");
  });
  it("does not fire on a normal status question", () => {
    expect(correctIntent("How's it going in the dark mode room?")?.tool).toBe(
      "check_progress",
    );
  });
});

describe("intent corrector — leaves real work to the model (returns null)", () => {
  const workRequests = [
    "Get five agents on a full dark mode for the website.",
    "Spin up a room to fix the broken login.",
    "Have a couple of agents research the cat-sitter market.",
    "Build a Stripe integration in a separate service.",
    "Throw a team at redesigning the pricing page.",
    "Someone should look into why the dashboard is slow.",
  ];
  for (const text of workRequests) {
    it(`does not hijack: "${text.slice(0, 40)}…"`, () => {
      expect(correctIntent(text)).toBeNull();
    });
  }
});
