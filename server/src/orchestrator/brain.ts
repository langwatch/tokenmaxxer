import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import type { FleetAgentView } from "../events.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

export interface DispatchDecision {
  action: "spawn" | "reuse";
  slug: string;
  workspace: "playground" | "fresh";
  worker_prompt: string;
}

const ROUTE_TOOL: Anthropic.Tool = {
  name: "route_mission",
  description: "Route a mission to the agent fleet.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["spawn", "reuse"],
        description:
          "reuse ONLY when an existing agent is on the same workstream and " +
          "the mission is a follow-up or change of direction on that work. " +
          "Otherwise spawn — agents are free.",
      },
      slug: {
        type: "string",
        description:
          "For reuse: the existing agent's slug exactly. For spawn: a new " +
          "kebab-case slug derived from the topic, max 30 chars.",
      },
      workspace: {
        type: "string",
        enum: ["playground", "fresh"],
        description:
          "playground when the mission is about the live prototype site " +
          "shown in the room (pages, UI, styling, site features). fresh for " +
          "everything else: research, separate codebases, documents.",
      },
      worker_prompt: {
        type: "string",
        description:
          "The complete prompt to send to the worker agent. Self-contained: " +
          "mission, relevant meeting context, and what done looks like.",
      },
    },
    required: ["action", "slug", "workspace", "worker_prompt"],
  },
};

export async function decideDispatch(
  mission: string,
  topic: string,
  fleet: FleetAgentView[],
): Promise<DispatchDecision> {
  const fleetDescription =
    fleet.length === 0
      ? "(fleet is empty)"
      : fleet
          .map(
            (a) =>
              `- slug=${a.slug} topic="${a.topic}" status=${a.status} mission="${a.mission.slice(0, 140)}"`,
          )
          .join("\n");

  const response = await anthropic.messages.create({
    model: config.brainModel,
    max_tokens: 1000,
    tools: [ROUTE_TOOL],
    tool_choice: { type: "tool", name: "route_mission" },
    messages: [
      {
        role: "user",
        content: `You route missions from a live meeting to a fleet of autonomous Claude Code worker agents.

Current fleet:
${fleetDescription}

New mission (topic label: "${topic}"):
${mission}

Route it. Spawn liberally — compute is unlimited. Reuse only for follow-ups on the same workstream.`,
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("brain returned no routing decision");
  return toolUse.input as DispatchDecision;
}
