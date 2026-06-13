/**
 * Task routing — the tool Max picks IS the route. Page and visual requests
 * go to the fast page model (write_page / edit_page); real engineering and
 * research go to a Claude agent (dispatch_work). This drives the REAL
 * gateway (Inworld gemma-4 tool calling) with a labeled set of spoken
 * requests and asserts each routes to the right family. Binds
 * specs/task-routing.feature.
 *
 * The fleet runs in dry-run here so "real work" routing doesn't spawn tmux
 * agents — we only assert which tool fired.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  GatewayClient,
  startTestServer,
  type TestServer,
} from "./helpers/gateway.js";

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer({ TOKENMAXXER_FLEET_DRYRUN: "1" });
});
afterAll(() => server?.stop());

const PAGE_TOOLS = new Set(["write_page", "edit_page", "open_page"]);
const WORK_TOOLS = new Set(["dispatch_work"]);

/** Send one text request, return the first tool Max calls. */
async function routeOf(text: string): Promise<string> {
  const client = new GatewayClient();
  await client.connect(server.url);
  await client.configureManualTurns();
  client.sayText(text);
  const evt = await client.waitFor(
    (e) => e.type === "tokenmaxxer.tool" && e.phase === "started",
    60_000,
  );
  client.close();
  return String(evt.tool);
}

describe("task routing — page jobs go to the fast page model", () => {
  const pageRequests = [
    "Throw a landing page for our cat-sitting startup on the screen.",
    "Make me a pricing page with three tiers.",
    "Put up a simple coming-soon page for the launch.",
  ];
  for (const text of pageRequests) {
    it(`"${text.slice(0, 40)}…" → a page tool`, async () => {
      const tool = await routeOf(text);
      expect(PAGE_TOOLS.has(tool), `routed to ${tool}`).toBe(true);
    }, 90_000);
  }
});

describe("task routing — real work goes to a Claude agent", () => {
  const workRequests = [
    "Implement a basic login with a backend for our app.",
    "Research the market size for cat sitters and write up findings.",
    "Build an integration that syncs our orders with Stripe.",
  ];
  for (const text of workRequests) {
    it(`"${text.slice(0, 40)}…" → dispatch_work`, async () => {
      const tool = await routeOf(text);
      expect(WORK_TOOLS.has(tool), `routed to ${tool}`).toBe(true);
    }, 90_000);
  }
});
