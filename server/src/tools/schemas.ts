/**
 * Tool definitions sent to the Inworld session. OpenAI Realtime "function"
 * format. Descriptions are written to steer gemma-4's trigger behavior.
 *
 * gemma-4 is a small model: it routes best on SHORT, positive, example-led
 * descriptions where each tool leads with its unique action verb and carries
 * the actual spoken phrasings as examples. Long "NOT the other tool"
 * disclaimers backfire — naming another tool in a description makes the model
 * more likely to pick it. So each description claims its own ground and barely
 * mentions the others. The session runs at temperature 0 so the same sentence
 * always routes the same way. Routing is measured by scripts/experiment-delegation.ts.
 */

export const TOOL_SCHEMAS = [
  {
    type: "function",
    name: "spawn_room",
    description:
      "Spin up a team of agents to DO new work: build, make, implement, fix, " +
      "redesign, refactor, research, or investigate something. Examples: " +
      "'get five agents on a full dark mode', 'spin up a room to fix the " +
      "login', 'throw a team at redesigning the pricing page', 'have a couple " +
      "of agents research the cat-sitter market', 'build a Stripe " +
      "integration', 'someone should look into why the dashboard is slow'. " +
      "Fire the moment new work is mentioned, never ask permission.",
    parameters: {
      type: "object",
      properties: {
        mission: {
          type: "string",
          description:
            "Self-contained brief for agents who did NOT hear the meeting: " +
            "the goal, key context, and what done looks like. 2-4 sentences.",
        },
        topic: {
          type: "string",
          description:
            "Stable 2-4 word lowercase label for this workstream, e.g. " +
            "'dark mode' or 'login fix'. Reuse the SAME label later to reach " +
            "the same room.",
        },
        agents: {
          type: "number",
          description:
            "How many agents to put in the room. Use the number asked for " +
            "(e.g. 'five agents' = 5, 'a couple' = 2). Omit for a default " +
            "small team.",
        },
        project: {
          type: "string",
          description:
            "Which codebase to work in if named, e.g. 'the website' or " +
            "'langwatch'. Omit if unstated.",
        },
      },
      required: ["mission", "topic"],
    },
  },
  {
    type: "function",
    name: "open_url",
    description:
      "Open a browser window to SHOW something that already exists: a " +
      "website, a repo, a page, a GitHub issue or PR. Examples: 'pull up the " +
      "new website on the screen', 'open issue 1234 on langwatch', 'show me " +
      "the langwatch repo', 'put the live site on the screen for everyone', " +
      "'bring up the dashboard'. It only displays an existing thing.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The full URL to open, or 'the website' for the live local " +
            "site (the room resolves it). For a GitHub issue build the " +
            "github.com issues URL.",
        },
        label: {
          type: "string",
          description: "Optional short label for what is being opened.",
        },
      },
      required: ["url"],
    },
  },
  {
    type: "function",
    name: "add_agents",
    description:
      "Add MORE agents to a room that is already running — increase its " +
      "headcount with extra workers. Examples: 'throw two more agents at the " +
      "dark mode room', 'double the team on the login fix', 'add three more " +
      "hands to it', 'put a couple more agents on that'. Always means more " +
      "people on an existing room.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The room's workstream label, e.g. 'dark mode'.",
        },
        count: {
          type: "number",
          description: "How many agents to add. Omit for one.",
        },
      },
      required: ["topic"],
    },
  },
  {
    type: "function",
    name: "message_room",
    description:
      "Relay a NOTE or reminder to a room that is already running, without " +
      "adding anyone. Examples: 'tell the dark mode room to keep the logo " +
      "readable', 'remind the login room to write tests as they go', 'let " +
      "them know to match the brand colors', 'have them commit often'. You " +
      "are passing along a message the agents will read.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The room's workstream label, e.g. 'dark mode'.",
        },
        message: {
          type: "string",
          description: "The note to broadcast into the room's channel.",
        },
      },
      required: ["topic", "message"],
    },
  },
  {
    type: "function",
    name: "close_room",
    description:
      "Shut a room down when the team is done with it: kill its agents and " +
      "clear its channel. Examples: 'kill the dark mode room', 'shut down the " +
      "login room', 'close that room', 'stop the agents on dark mode', \"we're " +
      "done with the pricing room\". Frees it up for the next run.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The room's workstream label, e.g. 'dark mode'.",
        },
      },
      required: ["topic"],
    },
  },
  {
    type: "function",
    name: "check_progress",
    description:
      "Answer a QUESTION about how the rooms are doing. Examples: \"how's it " +
      "going in the dark mode room?\", \"what's everyone working on right " +
      "now?\", 'any update on the rooms?', 'where are we?', 'give me a quick " +
      "status on the rooms'. It is a status question, so read the rooms back " +
      "in two or three spoken sentences.",
    // A required param on purpose: schemas with empty `properties` make
    // gemma-4 emit nameless function calls on the wire.
    parameters: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          description:
            "Which room to report on (its topic), or 'all' for everything.",
        },
      },
      required: ["scope"],
    },
  },
] as const;
