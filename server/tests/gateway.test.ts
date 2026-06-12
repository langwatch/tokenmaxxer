/**
 * Gateway integration tests — a real server subprocess talking to the real
 * Inworld API, exercised the way the scenario adapter drives it. Binds
 * specs/voice-gateway.feature.
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  GatewayClient,
  startTestServer,
  type TestServer,
} from "./helpers/gateway.js";

const PLAYGROUND_PAGES = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "playground",
  "src",
  "pages",
);
const QA_PAGE = path.join(PLAYGROUND_PAGES, "qa-smoke.tsx");

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(() => {
  server?.stop();
  fs.rmSync(QA_PAGE, { force: true });
});

describe("voice gateway", () => {
  it("handshakes, owns the session config, and speaks real audio", async () => {
    const client = new GatewayClient();
    await client.connect(server.url);
    // Client sends its own model/instructions — the gateway must override
    // them with Max's config and still apply manual turn detection.
    await client.configureManualTurns();

    client.sayText("Say only the words: systems check complete.");
    await client.waitFor((e) => e.type === "response.done", 60_000);

    expect(client.audioBytes()).toBeGreaterThan(10_000);
    const transcriptEvt = client.events.find(
      (e) => e.type === "response.output_audio_transcript.done",
    );
    expect(transcriptEvt, "agent transcript event missing").toBeDefined();
    client.close();
  });

  it("forwards transcripts as tokenmaxxer.transcript events", async () => {
    const client = new GatewayClient();
    await client.connect(server.url);
    await client.configureManualTurns();

    client.sayText("Quick mic test, say anything brief.");
    await client.waitFor(
      (e) => e.type === "tokenmaxxer.transcript" && e.role === "agent",
      60_000,
    );
    const userEcho = client.events.find(
      (e) => e.type === "tokenmaxxer.transcript" && e.role === "user",
    );
    expect(userEcho, "user transcript event missing").toBeDefined();
    client.close();
  });

  it("executes check_progress server-side and answers with voice", async () => {
    const client = new GatewayClient();
    await client.connect(server.url);
    await client.configureManualTurns();

    client.sayText("Status check — what is the fleet working on right now?");
    const finished = await client.waitFor(
      (e) =>
        e.type === "tokenmaxxer.tool" &&
        e.tool === "check_progress" &&
        e.phase === "finished",
      60_000,
    );
    expect(String(finished.result)).toContain("Fleet is empty");

    // The spoken acknowledgement after the function-call round trip.
    await client.waitFor(
      (e) => e.type === "response.output_audio_transcript.done",
      60_000,
    );
    expect(client.audioBytes()).toBeGreaterThan(0);
    client.close();
  });

  it("writes a real page through write_page and navigates the room screen", async () => {
    fs.rmSync(QA_PAGE, { force: true });
    const client = new GatewayClient();
    await client.connect(server.url);
    await client.configureManualTurns();

    client.sayText(
      "Put a page called qa-smoke on the screen: a one-section page that " +
        "says 'quality assurance lives here' with a big heading.",
    );
    const finished = await client.waitFor(
      (e) =>
        e.type === "tokenmaxxer.tool" &&
        (e.tool === "write_page" || e.tool === "edit_page") &&
        e.phase === "finished",
      90_000,
    );
    expect(String(finished.result)).toContain("live");

    expect(fs.existsSync(QA_PAGE), "page file not written").toBe(true);
    const code = fs.readFileSync(QA_PAGE, "utf8");
    expect(code).toContain("export default function Page()");

    await client.waitFor(
      (e) => e.type === "tokenmaxxer.navigate" && e.path === "/qa-smoke",
      30_000,
    );
    client.close();
  });
});
