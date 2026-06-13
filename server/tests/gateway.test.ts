/**
 * Gateway integration tests — a real server subprocess talking to the real
 * Inworld API, exercised the way the scenario adapter drives it. Binds
 * specs/voice-gateway.feature.
 *
 * Runs the room engine in dry-run so a spoken request that opens a browser or
 * reads room state never launches real tmux agents. Not part of CI (needs the
 * live Inworld API).
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

afterAll(() => {
  server?.stop();
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

    client.sayText("Status check — what is everyone working on right now?");
    const finished = await client.waitFor(
      (e) =>
        e.type === "tokenmaxxer.tool" &&
        e.tool === "check_progress" &&
        e.phase === "finished",
      60_000,
    );
    // No rooms have been spun up in this fresh session.
    expect(String(finished.result)).toContain("No rooms running");

    // The spoken acknowledgement after the function-call round trip.
    await client.waitFor(
      (e) => e.type === "response.output_audio_transcript.done",
      60_000,
    );
    expect(client.audioBytes()).toBeGreaterThan(0);
    client.close();
  });

  it("opens a real URL on the room screen through open_url and navigates", async () => {
    const client = new GatewayClient();
    await client.connect(server.url);
    await client.configureManualTurns();

    client.sayText("Pull up the new website on the screen for us.");
    const finished = await client.waitFor(
      (e) =>
        e.type === "tokenmaxxer.tool" &&
        e.tool === "open_url" &&
        e.phase === "finished",
      90_000,
    );
    expect(String(finished.result)).toContain("opened");

    // The room screen is told to navigate to the opened URL.
    const nav = await client.waitFor(
      (e) => e.type === "tokenmaxxer.navigate",
      30_000,
    );
    expect(String(nav.path)).toMatch(/^https?:\/\//);
    client.close();
  });
});
