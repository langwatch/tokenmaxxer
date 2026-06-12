# Demo runbook

## Setup (2 minutes, do this before people walk in)

```bash
cd ~/Projects/tokenmaxxer
pnpm dev          # gateway :4870 + console :5170 + playground :5171
                  # the gateway auto-starts the jimmy proxy if it's down
```

Open **http://localhost:5170** on the room screen / projector. Click
**start listening** once (grants the mic). Max greets the room. You're live.

Pre-flight checks:

- Green **LIVE** dot in the console header.
- Say "Max, quick check — you there?" → Max answers within ~2s.
- `curl -s localhost:4100/v1/models` → jimmy proxy answers.

If gemma-4 reports capacity problems the gateway retries and then switches
to the fallback model automatically — the demo keeps going (a banner shows
the switch).

## The arc (10 minutes)

1. **The hook.** "This room has unlimited compute. Watch what that means."
   Small talk with Max — show it's a real conversation, sub-second replies.

2. **Speed.** "Max, put a landing page for <audience suggestion> on the
   screen." The page appears mid-sentence (jimmy, ~0.5s codegen). Then:
   "make it pop" / "add a pricing section with three tiers" — edits land
   in seconds. Let the audience drive.

3. **Scale.** Drop three ideas in a row: "someone should research the
   market for this", "draft the investor one-pager", "build a waitlist
   API". Watch the fleet panel fill with claude agents (sonnet workers in
   tmux via kanban). Each shows live status from its STATUS.md heartbeat.

4. **The kicker.** Keep talking about something else for two minutes, then:
   "Max, how's it going?" — Max summarizes what the whole fleet did while
   the room was chatting. Open a worker's output. Nothing waited for the
   meeting to end.

5. **The machinery** (if asked): LangWatch traces of every routing
   decision and codegen call; the voice scenario test recordings; the
   codegen experiment table (jimmy 525ms vs everything else 9-21s).

## Things that can go sideways

| symptom | fix |
| --- | --- |
| Max silent after a question | semantic VAD missed the turn end — say a clear short sentence; barge-in always works |
| "model at capacity" banner | automatic — retries then falls back; keep talking |
| page tool slow | jimmy proxy died; the chain falls back to gemini (slower but lands). `python3 ~/Projects/jimmy-proxy/proxy.py --port 4100` to revive |
| fleet agent stuck | `kanban capture tmx-<slug>` to look, `kanban send tmx-<slug> "<nudge>"` to steer |
| echo / Max hears itself | console uses echo cancellation; lower speaker volume a notch |

## Reset between runs

```bash
rm -f playground/src/pages/*.tsx && git -C playground checkout src/pages/home.tsx
tmux ls | grep tmx- | cut -d: -f1 | xargs -n1 tmux kill-session -t   # clear the fleet
```
