/**
 * Tool definitions sent to the Inworld session. OpenAI Realtime "function"
 * format. Descriptions are written to steer gemma-4's trigger behavior — they
 * carry as much weight as the persona.
 *
 * gemma-4 is a small model: it matches TRIGGER WORDS and EXAMPLES far better
 * than abstract rules, and it turns whichever tool's description is "loudest"
 * into a catch-all. So each tool here gets balanced, example-led triggers plus
 * one short line drawing the boundary against the tool it's most confused with.
 */

export const TOOL_SCHEMAS = [
  {
    type: "function",
    name: "spawn_room",
    description:
      "DO or BUILD real work as a room of agents who self-organize in a " +
      "channel. Trigger words: build, make, implement, add (a feature), fix, " +
      "redesign, refactor, research, investigate, look into, 'get N agents " +
      "on …', 'spin up a room …', 'throw a team at …'. Examples: 'get five " +
      "agents on dark mode', 'spin up a room to fix the login', 'throw a " +
      "team at redesigning the pricing page', 'research the cat-sitter " +
      "market', 'someone look into why the dashboard is slow'. Fire the " +
      "moment such work is mentioned — never ask permission. If a room for " +
      "this topic already exists, this passes the new direction along. " +
      "Boundary: if they only want to LOOK AT something that already exists, " +
      "that is open_url, not spawn_room.",
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
      "SHOW an already-existing thing on the room screen by opening a " +
      "browser window. Trigger words: 'pull up', 'show me', 'open' (an " +
      "issue/PR/site/link), 'put … on the screen', 'bring up', \"let's see\". " +
      "Examples: 'pull up the new website', 'open issue 1234 on langwatch', " +
      "'show me the repo', 'put the live site on the screen'. This only " +
      "DISPLAYS something that already exists — it never builds, changes, or " +
      "fixes anything (that's spawn_room) and is never a status answer " +
      "(that's check_progress). For the live website pass url 'the website' " +
      "(the room resolves it — do NOT guess a port); for a GitHub issue " +
      "build https://github.com/langwatch/langwatch/issues/<n>.",
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
    name: "message_room",
    description:
      "Send a NOTE or INSTRUCTION into a room that is ALREADY running — you " +
      "are telling its agents something. Trigger words: tell, remind, let " +
      "them know, have them, ask them to. Examples: 'tell the dark mode room " +
      "to keep the logo readable', 'remind the login room to write tests', " +
      "'let them know to match the brand colors'. Boundary: this is giving a " +
      "directive TO a room — it is NOT asking how they are doing (that's " +
      "check_progress) and it opens nothing.",
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
      "Put MORE agents on a room already running. Trigger words: 'throw N " +
      "more agents at …', 'add more hands', 'double the team', 'more people " +
      "on …'. Examples: 'throw two more agents at the dark mode room', " +
      "'double the team on the login fix'. Boundary: only for adding muscle " +
      "to an existing room — not for opening anything (open_url) or starting " +
      "new work (spawn_room).",
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
    name: "check_progress",
    description:
      "ASK how the rooms are doing — you are answering a question about " +
      "status. Trigger words: 'how's it going', 'what's everyone working " +
      "on', 'status', 'any update', 'where are we', 'how are the rooms'. " +
      "Examples: 'how's it going in there?', 'what's everyone working on " +
      "right now?', 'give me a status'. Then summarize only what's new in " +
      "two or three spoken sentences. Boundary: a status QUESTION never " +
      "opens a browser (open_url) and is never a note to the room " +
      "(message_room).",
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
