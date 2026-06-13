# tokenmaxxer

**The meeting room that ships while you talk.**

Hackathon theme: *what if compute and tokens were no longer a limitation?*

You sit down for a day of work. Microphones are on. Max — a realtime
voice agent — is in the room with you. You exchange ideas, argue, change
your mind. Behind your voice, Max is spinning up Claude Code agents by the
dozen, reusing the ones already on the right workstream, and painting
prototype pages on the room screen at 17,000 tokens per second. Nothing
waits for the meeting to end. Some of the work gets thrown away. Compute
is unlimited — hesitation is the only cost.

## It controls your machine, not a tab

tokenmaxxer is not a webpage you build inside — it's an agent that drives
your real desktop. Say "landing page for the cat startup" and a real
browser window pops open at a screen quarter showing it. Say "implement a
login" and a real Warp terminal opens with Claude Code working in it. When
work finishes, it tells you and pops the PR — even while you're talking
about something else. A floating HUD shows the room is listening, on top of
everything.

```
 room mic ──► HUD overlay (Electron) ──ws──► gateway (server, on your Mac)
              always-on-top, transparent          │  ←ws→ Inworld Realtime (gemma-4)
                                                   │
   ┌── desktop control (osascript / Warp) ◄────────┤ tool calls
   │     • write_page → chromeless Chrome window, tiled, live (Vite HMR)
   │     • dispatch_work → Warp window, tmux, Claude Code, watch it work
   │     • done → macOS notification + the PR window, proactively
   │
   └── the work appears AROUND the HUD as real windows
                                                   │
   page model (switchable) ◄───────────────────────┤ jimmy / gemini / haiku / gemma
   fleet ◄── orchestrator (Claude brain) ── kanban CLI ── tmux ── N × claude code
```

- **server/** — voice gateway (OpenAI Realtime-compatible WS, proxies
  Inworld), server-side tool execution, the **desktop control layer**
  (platform-agnostic `DesktopController`; macOS adapter via osascript +
  Warp; Windows stub for the incoming teammate), the orchestrator brain,
  the switchable page-model registry, scenario voice tests.
- **hud/** — Electron shell: a frameless, transparent, always-on-top overlay
  wrapping the console in HUD mode (reuses the console's mic/audio/WS stack).
- **console/** — the room console (full dashboard) and the compact HUD view
  (`?hud=1`): mic/audio, transcript, tool feed, fleet, model.
- **playground/** — pre-scaffolded vite + react + tailwind site with
  file-per-page routing. Written by the fast model in seconds, deepened by
  Claude agents; shown in the real prototype window.
- **specs/** — BDD feature specs for everything above.

Run the HUD overlay (after `pnpm dev`): `pnpm hud`. Desktop control is on by
default on macOS; set `TOKENMAXXER_DESKTOP=0` to run headless.

## Run it

```bash
pnpm install
cp .env.example .env   # fill in the keys (INWORLD_API_KEY, ANTHROPIC_API_KEY,
                       # OPENAI_API_KEY, GEMINI_API_KEY, LANGWATCH_API_KEY)
pnpm dev               # gateway :4870 + console :5170 + playground :5171
                       # the gateway auto-starts the jimmy proxy if it's down
```

Open the console at http://localhost:5170, click **start listening**, and talk.
Demo script and failure playbook: [DEMO.md](DEMO.md).

Worker agents are spawned through the [kanban CLI](https://github.com/langwatch)
in tmux; `TOKENMAXXER_AGENT_MODEL` picks their model (`sonnet` for testing).

## Test it

```bash
cd server
pnpm test          # 19 tests, all real, no mocks: scenario voice tests with
                   # real audio + judge, fleet e2e spawning a real claude
                   # agent in tmux, gateway integration, jimmy codegen
pnpm typecheck
```

Voice runs leave listenable recordings in `server/outputs/recordings/`.

## Why jimmy (the speed data)

LangWatch experiment `tokenmaxxer-codegen-chain`, 8 page briefs × 4 models
(`server/scripts/experiment-codegen.ts`):

| model | p50 latency | valid | judge quality |
|---|---|---|---|
| chatjimmy (Llama 3.1 8B @ ~17k tok/s) | **~0.8s** | 5/8 | 0.65 |
| inworld gemma-4 (text-mode realtime) | 8005ms | 8/8 | 0.92 |
| gemini-2.5-flash | 8592ms | 8/8 | 0.92 |
| claude haiku 4.5 | 13320ms | 8/8 | **0.93** |
| gpt-4.1-mini | 15701ms | 8/8 | 0.90 |

jimmy is the only model that puts the page on screen as the sentence ends;
the fallbacks cover its misses, and the claude fleet deepens whatever lands.
The room can switch the page model by voice ("use the smart model for
pages") — haiku is the sharpest, gemini-flash the best speed/quality
balance.
