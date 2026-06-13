# Demo runbook

## Setup (2 minutes, do this before people walk in)

```bash
# the site the agents work on (keep it running)
cd ~/Projects/2lang-2watch && pnpm dev      # http://127.0.0.1:5173

cd ~/Projects/tokenmaxxer
pnpm dev          # gateway :4870 + console :5170
pnpm hud          # the floating always-on-top listening HUD (Electron)
```

Have the **KanbanCode** app open — it's the board that shows the rooms and
the agents chatting. Start the vite dev servers FRESH right before the demo
(long-running ones can wedge their tailwind pipeline).

Grant **Accessibility** to the terminal/Electron once (System Settings →
Privacy & Security → Accessibility) so window tiling works, and
**Microphone** on first listen. Click **listen** on the HUD; Max greets the
room. You're live.

**The desktop is the demo.** A spoken mission spins up real Claude agents in
real Warp terminals, the KanbanCode board comes forward on the room's
channel so you watch them coordinate, and `open_url` puts the live site or a
GitHub issue on the screen. Set `TOKENMAXXER_DESKTOP=0` to run headless (the
console at http://localhost:5170 still shows the transcript, tool feed, and
live fleet).

Pre-flight checks (one command, every moving part):

```bash
cd server && npx tsx scripts/preflight.ts   # 🚀 ALL SYSTEMS GO or it tells you what's broken
```

Then the human check: green **LIVE** dot, say "Max, quick check, you there?"
→ Max answers within ~2s.

If gemma-4 reports capacity problems the gateway retries and then switches
to the fallback model automatically — the demo keeps going (a banner shows
the switch).

## The arc (the swarm is the story)

1. **The hook.** "This room has unlimited compute. One agent is one context
   window on one thread. Watch what ten in parallel looks like." Small talk
   with Max — show it's a real conversation, sub-second replies.

2. **Put the work on the screen.** "Max, pull up the new website." A real
   browser window flies open at the running site (`open_url` resolves "the
   website" to the local site — no port guessing).

3. **Spin up a room (the Iron Man moment).** "Get five agents on a full dark
   mode for the website." Five Warp terminals fly open with Claude Code, the
   KanbanCode board comes forward on the `#full-dark-mode` channel, and you
   watch the agents self-organize: one says "I'll take the CSS foundations
   and global components, someone take the pages", another claims the pages,
   a third reviews. **You assigned no roles.** That's the agent loop — a
   natural ralph-loop where the agents hold each other to the mission.

4. **Steer by voice, live.** Keep talking to the room: "tell them to keep the
   logo readable on black" (`message_room`), "throw two more agents at it"
   (`add_agents`). The team reacts in the channel without you touching a
   keyboard.

5. **A second front.** "We saw someone opened issue 1234 on langwatch — pull
   it up." The issue opens on the screen (`open_url`). "Get a couple agents
   to fix it." A new room spins up on the langwatch repo, its own channel,
   its own terminals. Two missions running in parallel.

6. **The kicker (proactive).** Keep talking about something else. When a room
   lands a PR, a notification fires and the PR window pops on its own — you
   didn't ask. Or: "Max, how's it going in there?" and he reads the room
   back to you from the channel (`check_progress`).

The pitch in one line: separate, visible sessions give you full control of N
context windows working in parallel — not one agent burning tokens on hidden
sub-tasks.

## Things that can go sideways

| symptom | fix |
| --- | --- |
| Max silent after a question | semantic VAD missed the turn end — say a clear short sentence; barge-in always works |
| "model at capacity" banner | automatic — retries then falls back; keep talking |
| Max opens a browser instead of spinning a room | he misheard "build" as "show" — rephrase as "get agents on X" / "spin up a room to X" |
| agents launched but not talking yet | claude takes a few seconds to boot; they join the channel once ready — watch the board |
| board didn't come forward | grant Accessibility; or click the KanbanCode channel yourself (`kanban channel open <name>`) |
| terminals open but don't tile | grant Accessibility to the terminal/Electron; they still open, just not snapped |
| browser window on the wrong Space | it shouldn't — we launch a dedicated chromeless instance on the current Space |
| echo / Max hears itself | echo cancellation is on; lower speaker volume a notch |

## Reset between runs

```bash
# stop the agents, leave their cards
tmux ls | grep '^tmx-' | cut -d: -f1 | xargs -n1 tmux kill-session -t
# reset the demo site
git -C ~/Projects/2lang-2watch checkout . && git -C ~/Projects/2lang-2watch clean -fd
# clear the room channels + their history
for c in $(ls ~/.kanban-code/channels/*.jsonl 2>/dev/null | xargs -n1 basename | sed 's/.jsonl//'); do
  case "$c" in dark-mode|full-dark-mode|login*|issue*) kanban channel delete "$c"; rm -f ~/.kanban-code/channels/$c.jsonl;; esac
done
# close prototype/browser windows
pkill -f tokenmaxxer-chrome
rm -f ~/.warp/launch_configurations/tokenmaxxer-*.yaml
```
