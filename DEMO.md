# Demo runbook

## Setup (2 minutes, do this before people walk in)

```bash
cd ~/Projects/tokenmaxxer
pnpm dev          # gateway :4870 + console :5170 + playground :5171
                  # the gateway auto-starts + warms the jimmy proxy
pnpm hud          # the floating always-on-top listening HUD (Electron)
```

Start these FRESH right before the demo — vite dev servers that have been
running for hours can wedge their tailwind CSS pipeline (pages render
unstyled until restarted).

Grant **Accessibility** to the terminal/Electron once (System Settings →
Privacy & Security → Accessibility) so window tiling works, and
**Microphone** on first listen. Click **listen** on the HUD; Max greets the
room. You're live.

**The desktop is the demo.** With desktop control on (default on macOS),
pages open as real chromeless browser windows tiled top-right, Claude
agents open as real Warp terminals bottom-right, and the PR pops on its own
when work finishes. The full room console at http://localhost:5170 is still
there (transcript, tool feed, fleet, preview) if you want it on a second
screen. Set `TOKENMAXXER_DESKTOP=0` to fall back to the in-console iframe
preview (e.g. on a projector with no window space).

Pre-flight checks (one command, every moving part):

```bash
cd server && npx tsx scripts/preflight.ts   # 🚀 ALL SYSTEMS GO or it tells you what's broken
```

Then the human check: green **LIVE** dot, say "Max, quick check — you
there?" → Max answers within ~2s.

If gemma-4 reports capacity problems the gateway retries and then switches
to the fallback model automatically — the demo keeps going (a banner shows
the switch).

## The arc (10 minutes)

1. **The hook.** "This room has unlimited compute. Watch what that means."
   Small talk with Max — show it's a real conversation, sub-second replies.

2. **Speed.** "Max, put a landing page for <audience suggestion> on the
   screen." A real browser window flies open at the top-right corner
   mid-sentence (jimmy, ~0.5s codegen). Then: "make it pop" / "add a
   pricing section with three tiers" — the same window updates live. Let
   the audience drive. Want it sharper? "use the smart model for pages" →
   Max switches to haiku.

3. **Scale (the Iron Man moment).** "Get an agent to implement a login API"
   → a Warp window flies open bottom-right with Claude Code building it, in
   real time. Drop two more: "research the market for this", "build a
   Stripe integration" — terminals fan out across the screen, the page
   window stays top-right, the HUD floats over it all. Pages go to the fast
   model; real work goes to agents — routing is automatic.

4. **The kicker (proactive).** Keep talking about something else. When an
   agent finishes, a notification fires and its PR window pops on its own —
   you didn't ask. Or: "Max, how's it going?" and he summarizes the fleet.

5. **The machinery** (if asked): LangWatch traces + simulations (now with
   full transcripts); the codegen benchmark across 5 models (jimmy 0.8s vs
   haiku 13s, quality 0.65 vs 0.93); the voice scenario recordings.

## Things that can go sideways

| symptom | fix |
| --- | --- |
| Max silent after a question | semantic VAD missed the turn end — say a clear short sentence; barge-in always works |
| "model at capacity" banner | automatic — retries then falls back; keep talking |
| page tool slow | jimmy proxy died; the chain falls back to gemini (slower but lands). `python3 ~/Projects/jimmy-proxy/proxy.py --port 4100` to revive |
| fleet agent stuck | `kanban capture tmx-<slug>` to look, `kanban send tmx-<slug> "<nudge>"` to steer |
| windows open but don't tile | grant Accessibility to the terminal/Electron; they still open, just not snapped |
| browser window on the wrong Space | it shouldn't — we launch a dedicated chromeless instance on the current Space. If it does, click the HUD's Space first |
| echo / Max hears itself | echo cancellation is on; lower speaker volume a notch |

## Reset between runs

```bash
rm -f playground/src/pages/*.tsx && git -C playground checkout src/pages/home.tsx
tmux ls | grep tmx- | cut -d: -f1 | xargs -n1 tmux kill-session -t   # clear the fleet
rm -rf ~/Projects/tokenmaxxer-workspaces/* ~/.warp/launch_configurations/tokenmaxxer-*.yaml
pkill -f tokenmaxxer-chrome   # close prototype windows
```
