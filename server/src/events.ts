/**
 * tokenmaxxer.* extension events sent to clients alongside the OpenAI
 * Realtime passthrough events. Clients that don't know them (the scenario
 * test adapter) ignore them.
 */

export interface ToolEvent {
  type: "tokenmaxxer.tool";
  phase: "started" | "finished" | "failed";
  id: string;
  tool: string;
  args: Record<string, unknown>;
  result?: string;
  elapsedMs?: number;
}

export interface FleetAgentView {
  slug: string;
  mission: string;
  topic: string;
  workspace: string;
  status: "launching" | "working" | "idle" | "gone";
  lastActivity: string;
  launchedAt: number;
}

export interface FleetEvent {
  type: "tokenmaxxer.fleet";
  agents: FleetAgentView[];
}

export interface NavigateEvent {
  type: "tokenmaxxer.navigate";
  path: string;
}

export interface StatusEvent {
  type: "tokenmaxxer.status";
  message: string;
}

export interface TranscriptEvent {
  type: "tokenmaxxer.transcript";
  role: "user" | "agent";
  text: string;
  at: number;
}

export type TokenmaxxerEvent =
  | ToolEvent
  | FleetEvent
  | NavigateEvent
  | StatusEvent
  | TranscriptEvent;
