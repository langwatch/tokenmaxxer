/**
 * Pure helpers for the room engine — no config, no I/O — so they can be unit
 * tested without booting the gateway (config.ts requires live API keys at
 * import). The room manager imports these; tests import them directly.
 */

/** A kanban channel name: lowercase, dashes, must start alphanumeric. */
export function channelName(topic: string): string {
  const base = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "room";
}

/**
 * The coordinate-first brief every agent in a room receives. Pure (no I/O) so
 * it can be asserted directly: an agent is always told to JOIN the channel and
 * COORDINATE before building — that ordering is the whole delegation contract.
 */
export function buildAgentBrief(input: {
  name: string;
  teammates: string[];
  mission: string;
  channel: string;
  workspace: string;
  liveUrl?: string;
}): string {
  const { name, teammates, mission, channel, workspace, liveUrl } = input;
  const others = teammates.filter((n) => n !== name);
  const liveServer = liveUrl
    ? `The dev server is already running at ${liveUrl} with hot reload — do NOT start or restart it; your edits show up live.`
    : "";
  return [
    `You are ${name}, one of ${teammates.length} autonomous engineers in a swarm. You share everything with your teammates: ${others.join(", ") || "(solo for now)"}.`,
    "",
    `MISSION: ${mission}`,
    "",
    `Workspace: ${workspace} (a real git checkout). ${liveServer}`,
    "",
    `Your team coordinates in the kanban channel #${channel}. Treat messages pasted into your terminal as teammates talking to you — reply in the channel, don't ignore them.`,
    "",
    "DO THIS NOW, in order:",
    `1. Run: kanban channel join ${channel}`,
    `2. Run: kanban channel history ${channel} -n 30   (catch up on what's claimed)`,
    `3. Claim your slice out loud: kanban channel send ${channel} "taking <the part you'll own>"`,
    "4. Build it. Post short progress and blockers to the channel as you go, watch for teammates, review their work, and never edit a file someone already claimed.",
    "",
    "Rules: never ask permission — make the call. If nobody is coordinating, step up and coordinate. Speed matters: a working result in minutes beats perfect in an hour. Keep going until the mission is done, then say so in the channel.",
  ].join("\n");
}
