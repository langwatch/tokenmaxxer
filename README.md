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
| chatjimmy (Llama 3.1 8B @ ~17k tok/s) | **525ms** | 7/8 | 0.66 |
| gemini-2.5-flash | 9294ms | 8/8 | 0.92 |
| gpt-4.1-mini | 20956ms | 8/8 | 0.92 |
| inworld gemma-4 (text-mode realtime) | 9142ms | 8/8 | 0.92 |

jimmy is the only model that puts the page on screen as the sentence ends;
the fallbacks cover its misses, and the claude fleet deepens whatever lands.
