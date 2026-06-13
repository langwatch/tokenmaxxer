/**
 * Tool definitions sent to the Inworld session. OpenAI Realtime "function"
 * format. Descriptions are written to steer gemma-4's trigger behavior — they
 * carry as much weight as the persona, so they are blunt and example-led.
 *
 * gemma-4 is a small model that grabs one tool as a catch-all when it is
 * unsure, so every description both CLAIMS its own phrasings AND disclaims the
 * others' — open_url in particular is hard-gated to "show an existing thing".
 */

export const TOOL_SCHEMAS = [
  {
    type: "function",
    name: "spawn_room",
    description:
      "DO work: spin up a ROOM of Claude Code agents that land in one shared " +
      "chat channel and self-organize. Use for anything that MAKES or CHANGES " +
      "something — implement a feature, redesign a page, build dark mode, fix " +
      "a bug, refactor, or research/investigate. Fire the MOMENT work is " +
      "mentioned, even loosely: 'get five agents on dark mode', 'spin up a " +
      "room to fix the login', 'throw a team at redesigning the pricing " +
      "page', 'someone should look into why the dashboard is slow', 'have " +
      "some agents research X' → spawn_room. Never ask permission, never wait " +
      "for consensus. If a room for this topic already exists, this passes " +
      "the new direction along instead of forking it. NOT open_url — if they " +
      "want something built, changed, or fixed, it is a ROOM, not a browser " +
      "tab.",
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
    name: "message_room",
    description:
      "STEER a room that is ALREADY running: pass a note, correction, or " +
      "extra instruction to its agents without launching anyone new. 'Tell " +
      "the dark mode room to keep the logo readable', 'remind the login room " +
      "to write tests', 'let them know to match the brand colors' → " +
      "message_room. The agents see it in their channel and react. NOT " +
      "open_url and NOT spawn_room — nobody new is launched and nothing " +
      "opens on the screen.",
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
    name: "add_agents",
    description:
      "Add MORE agents to a room already in flight when the team wants more " +
      "horsepower on it. 'Throw two more agents at the dark mode room', " +
      "'double the team on the login fix', 'add three more hands to it' → " +
      "add_agents. NOT open_url — the new agents join the existing channel " +
      "and nothing opens on the screen.",
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
    name: "open_url",
    description:
      "SHOW an already-existing thing on the room screen: open a real " +
      "browser window at a website, a page, a GitHub issue or PR, or a " +
      "dashboard. This is a read-only 'put it on the screen' action. ONLY " +
      "fire it when the team asks to SEE / SHOW / OPEN / PULL UP / BRING UP " +
      "a specific thing: 'pull up the website', 'open issue 1234 on " +
      "langwatch', 'show me the repo', 'put the live site on the screen'. " +
      "DO NOT use open_url to build or change anything (that is spawn_room), " +
      "to steer a running room (message_room / add_agents), or to report " +
      "status (check_progress) — if you are unsure, it is almost never " +
      "open_url. For the live website pass url 'the website' — do NOT guess " +
      "a port; for a GitHub issue build https://github.com/langwatch/" +
      "langwatch/issues/<n>.",
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
    name: "check_progress",
    description:
      "Report STATUS of the rooms: how many agents and what they are saying " +
      "in their channels. Fire whenever anyone asks how it's going or what's " +
      "running: 'how's it going in there?', 'what's everyone working on?', " +
      "'give me a status', 'any update on the rooms?', 'where are we?' → " +
      "check_progress. Then summarize ONLY what's new in two or three spoken " +
      "sentences. NOT open_url — a status question never opens a browser.",
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
