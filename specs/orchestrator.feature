Feature: Orchestrator (the conductor)
  The orchestrator receives mission briefs from the voice layer and commands
  a fleet of long-lived Claude Code agents running in tmux via the kanban CLI.
  It decides whether to spawn a new agent or steer an existing one, tracks
  what every agent is doing, and exposes fleet state to the voice layer and
  the console. Agents are cheap; spawn liberally, reuse when it is the same
  workstream.

  Background:
    Given the orchestrator is running with access to the "kanban" CLI
    And the agent model is configurable and set to "sonnet" for testing

  Scenario: Dispatch spawns a new agent for a new workstream
    When a mission "research the cat-feeder market" arrives with no related agent
    Then the orchestrator launches a new kanban agent with a readable slug
    And the agent runs in its own workspace directory
    And the agent receives a mission prompt with the meeting context
    And dispatch returns an acknowledgement in under 2 seconds
      while the launch continues in the background

  Scenario: Dispatch reuses an agent for a follow-up on the same workstream
    Given an agent is already working on "cat-feeder landing page"
    When a mission arrives that changes direction on that same work
    Then the orchestrator sends the new instructions to the existing agent session
    And does not spawn a duplicate agent

  Scenario: The decision to spawn or reuse is made by a fast LLM
    When a mission brief arrives
    Then the orchestrator asks its brain model with the current fleet state
    And receives a structured decision: spawn or reuse, slug, workspace and prompt

  Scenario: Fleet state tracks every agent
    When agents are launched and working
    Then the orchestrator can list each agent with slug, mission, workspace,
      busy or idle state, and the latest activity summary

  Scenario: Progress check summarizes the fleet quickly
    When the voice layer calls check_progress
    Then the orchestrator returns a compact text summary of all active agents
      including recent transcript activity, in under 2 seconds

  Scenario: Playground missions run in the playground workspace
    When a mission is about the live playground site
    Then the agent is launched with the playground directory as its workspace
    And its file edits hot-reload in the room screen

  Scenario: Fleet events are observable
    When an agent is spawned, instructed, or reports activity
    Then a "tokenmaxxer.fleet" event is emitted for the console to render
