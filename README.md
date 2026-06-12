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

## Architecture

```
 room mic ──► console (browser) ──ws──► gateway (server) ──ws──► Inworld Realtime
                  ▲    ▲                    │ tool calls          (STT+LLM+TTS, gemma-4)
                  │    │                    ├─► write_page / edit_page ──► chatjimmy (~17k tok/s)
   playground ◄───┘    │                    │        └──► playground/src/pages/*.tsx (vite HMR)
   preview             │                    └─► dispatch_work / check_progress
                       │                             └──► orchestrator (Claude brain)
                fleet + tool feed                              └──► kanban CLI ──► tmux ──► N × claude code
```

- **server/** — voice gateway (OpenAI Realtime-compatible WS endpoint, proxies
  Inworld), tool execution, the orchestrator brain, the jimmy speed-codegen
  client, scenario voice tests.
- **console/** — the room screen: mic/audio, live transcript, tool activity
  feed, agent fleet panel, embedded playground preview.
- **playground/** — pre-scaffolded vite + react + tailwind site with
  file-per-page routing. Written to by jimmy in seconds, deepened by Claude
  agents in minutes.
- **specs/** — BDD feature specs for everything above.

## Run it

```bash
pnpm install
cp .env.example .env   # fill in the keys
pnpm dev               # gateway + console + playground
```

Open the console, click **start listening**, and talk.

## Test it

```bash
pnpm test          # integration + scenario voice tests (real audio, no mocks)
pnpm typecheck
```
