/**
 * Tool definitions sent to the Inworld session. OpenAI Realtime "function"
 * format. Descriptions are written to steer gemma-4's trigger behavior.
 */

export const TOOL_SCHEMAS = [
  {
    type: "function",
    name: "dispatch_work",
    description:
      "Dispatch a mission to the unlimited agent fleet. Fire-and-forget: an " +
      "agent (new or the one already on that topic) starts immediately in the " +
      "background. Use for research, building features or backends, drafts, " +
      "analysis — anything beyond a single visual page. Call it the moment " +
      "work is mentioned; never ask permission first.",
    parameters: {
      type: "object",
      properties: {
        mission: {
          type: "string",
          description:
            "Self-contained mission brief for a worker agent that did not " +
            "hear the meeting: goal, key context from the conversation, and " +
            "what done looks like. 2-5 sentences.",
        },
        topic: {
          type: "string",
          description:
            "Stable 2-4 word lowercase workstream label, e.g. 'cat sitter " +
            "market research'. Reuse the SAME label when the team changes " +
            "direction on existing work so it reaches the same agent.",
        },
      },
      required: ["mission", "topic"],
    },
  },
  {
    type: "function",
    name: "check_progress",
    description:
      "Get a compact status report of the agent fleet: what each agent is " +
      "working on and its latest activity. Call when anyone asks how things " +
      "are going or what is running.",
    // A required param on purpose: schemas with empty `properties` make
    // gemma-4 emit nameless function calls on the wire.
    parameters: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          description:
            "Which workstream to report on, or 'all' for the whole fleet.",
        },
      },
      required: ["scope"],
    },
  },
  {
    type: "function",
    name: "write_page",
    description:
      "Create a brand-new page on the live prototype site shown on the room " +
      "screen. Renders in seconds. Use for any new page, screen, landing " +
      "page or visual idea.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "URL slug for the new page, lowercase kebab-case, descriptive, " +
            "e.g. 'pricing' or 'purrbnb-landing'. Never 'home' — that is " +
            "the protected site index.",
        },
        description: {
          type: "string",
          description:
            "Vivid, specific one-paragraph description of the page: purpose, " +
            "sections, headline copy, vibe. The more concrete, the better " +
            "the result.",
        },
      },
      required: ["path", "description"],
    },
  },
  {
    type: "function",
    name: "edit_page",
    description:
      "Modify an existing page on the live prototype site. Renders in " +
      "seconds. Use when the team wants changes to something already on " +
      "screen.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Slug of the existing page, e.g. 'pricing'.",
        },
        instructions: {
          type: "string",
          description: "Specific changes to make, 1-3 sentences.",
        },
      },
      required: ["path", "instructions"],
    },
  },
  {
    type: "function",
    name: "open_page",
    description:
      "Navigate the room screen to a page that ALREADY EXISTS on the " +
      "prototype site. For a page that does not exist yet, call write_page " +
      "instead — never open_page.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Slug of the page to show, or 'home' for the index.",
        },
      },
      required: ["path"],
    },
  },
] as const;
