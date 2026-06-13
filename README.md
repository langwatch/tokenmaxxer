# tokenmaxxer

**The meeting room that ships while you talk.**

Hackathon theme: *what if compute and tokens were no longer a limitation?*

You sit down for a day of work. Microphones are on. Max, a realtime voice
agent, is in the room with you. You say "get five agents on a full dark mode
for the website" and five Claude Code agents spin up, pile into one shared
chat channel, and self-organize, one claims the CSS foundations, another
takes the pages, a third reviews. You didn't assign roles. You keep talking;
they keep working. Compute is unlimited, hesitation is the only cost.

**And it answers in about half a second.** You finish a sentence and the
terminals are already opening. The realtime voice loop (Inworld gemma-4) runs
at roughly **500ms** from your voice to the swarm moving, so it feels like
talking to someone in the room, not typing a command and waiting on a
spinner.

![Three agents splitting a dark-mode mission between themselves in one shared channel, from a single spoken sentence, with no roles assigned by a human](https://raw.githubusercontent.com/langwatch/pr-screenshots/main/pr-1/swarm-self-organizing.png)

*One spoken "get a few agents on dark mode" and the room fills with named
agents that divide the work themselves in the channel: one takes the CSS
foundations and theme toggle, another claims the pages, down to the ~89
hardcoded colors. Nobody assigned a thing.*

## It controls your machine, not a tab

tokenmaxxer is not a webpage you build inside, it drives your real desktop.
Say "spin up a room to fix the login" and real terminals fly open with Claude
Code agents working in them. The KanbanCode board comes forward showing the
agents talk to each other in real time. Say "pull up the website" and a real
browser window opens at the running site. A floating HUD shows the room is
listening, on top of everything.

```
 room mic ──► HUD overlay (Electron) ──ws──► gateway (server, on your Mac)
              always-on-top, transparent          │  ←ws→ Inworld Realtime (gemma-4)
                                                   │
   ┌── desktop control (osascript / Warp) ◄────────┤ tool calls
   │     • spawn_room → N Warp terminals, tmux, Claude Code, watch them work
   │     • focusChannel → KanbanCode board forward on the room's channel
   │     • open_url → chromeless Chrome window at the live site / a GitHub issue
   │     • done → macOS notification + the PR window, proactively
   │
   └── the swarm appears AROUND the HUD as real windows
                                                   │
   room ◄── kanban channel (the agent loop) ── kanban CLI ── tmux ── N × claude code
            agents claim slices, review each other, coordinate
```

### Why this wins (the swarm, not a single hidden agent)

- **Realtime, not request-and-wait**: ~500ms from your voice to the swarm
  moving. You steer N agents by talking over them, live, the way you'd brief a
  team, never a type-a-prompt-and-wait loop.
- **Agentic leverage**: N independent Claude agents on one mission, plus a
  voice agent listening live to steer them. Not one agent with hidden
  sub-tasks: N real sessions you can see and talk to.
- **Measurable impact**: 1 agent is one context window on one thread. N
  agents is N context windows working the problem in parallel. Separate
  sessions give you full control of all of them.
- **The agent loop**: the shared channel is a natural ralph-loop: agents
  keep messaging each other, finding issues, and pushing forward. One can
  step up as supervisor. No better loop than agents holding each other to it.
- **Cost / quality**: because the agents are under your control and visible,
  they don't burn tokens mysteriously doing random things.
- **Collaboration**: the team guides the swarm by voice, live, together.
- **Technical ambition**: the desktop layer is built behind a
  platform-agnostic adapter so it runs on Windows too, not just macOS.

## The pieces

- **server/**: voice gateway (OpenAI Realtime-compatible WS, proxies
  Inworld), server-side tool execution, the **room engine**
  (`orchestrator/room.ts`: spawn a swarm into a kanban channel, the
  coordinate-first agent brief, a deterministic project registry), and the
  **desktop control layer** (platform-agnostic `DesktopController`; macOS
  adapter via osascript + Warp + chromeless Chrome; Windows stub for the
  incoming teammate).
- **hud/**: Electron shell, a frameless, transparent, always-on-top overlay
  wrapping the console in HUD mode (reuses the console's mic/audio/WS stack).
- **console/**: the room console (transcript, tool feed, live fleet) and the
  compact HUD view (`?hud=1`).
- **specs/**: BDD feature specs for everything above.

The agents talk over [Kanban Code](https://github.com/langwatch) channels:
each agent has a tmux session kanban tracks, and a `kanban channel send`
broadcasts into every other agent's pane. Max joins the channel too (as
`@max`) so he can drop the mission in and pass along corrections by voice.

## Run it

```bash
pnpm install
cp .env.example .env   # INWORLD_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY,
                       # LANGWATCH_API_KEY
pnpm dev               # gateway :4870 + console :5170
pnpm hud               # the floating always-on-top listening HUD (Electron)
```

Desktop control is on by default on macOS (`TOKENMAXXER_DESKTOP=0` to run
headless). Click **listen** on the HUD and talk. Demo script and failure
playbook: [DEMO.md](DEMO.md).

The agents spawn through the kanban CLI in tmux; `TOKENMAXXER_AGENT_MODEL`
picks their model (`sonnet` for testing). The project a room works in is
resolved from what you say ("the website" → the local site checkout,
"langwatch" → the langwatch repo) in `server/src/orchestrator/projects.ts`.

## Test it

```bash
cd server
npx vitest run tests/room.unit.test.ts tests/desktop.test.ts   # network-free, CI
pnpm typecheck
```

The network-free unit tests cover the engine's pure core: how a spoken hint
resolves to a project, how a topic becomes a channel name, and the
coordinate-first brief every agent receives (it must tell the agent to JOIN
the channel and coordinate BEFORE building, that ordering is the whole
delegation contract). The scenario voice tests and the delegation experiment
eval drive the real gateway with audio and a judge; they need live APIs, the
kanban CLI, and tmux, so they run locally, not in CI.
