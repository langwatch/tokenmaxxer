Feature: Orchestrator (the room engine)
  The orchestrator turns a mission brief from the voice layer into a ROOM: a
  shared kanban channel plus a swarm of long-lived Claude Code agents running
  in tmux, all pointed at the same channel so they self-organize. There is no
  LLM "router" in the hot path - names are generated deterministically and
  the project maps to a workspace directly, so a room spins up fast and burns
  no extra tokens. Agents are cheap; spawn liberally, reuse the channel when
  it is the same workstream.

  Background:
    Given the orchestrator is running with access to the "kanban" CLI
    And the agent model is configurable and set to "sonnet" for testing

  Scenario: A mission spins up a room channel and its agents
    When a mission "full dark mode for the website" arrives for 3 agents
    Then the orchestrator creates a kanban channel for the room
    And launches 3 kanban agents with readable auto-generated slugs
    And each agent runs in the project's workspace directory
    And each agent's first instruction is to join the channel and coordinate
    And the mission is posted into the channel as Max
    And dispatch returns an acknowledgement in under 2 seconds
      while the launches continue in the background

  Scenario: Naming and routing need no LLM
    When a mission arrives
    Then agent slugs are generated without calling a model
    And the workspace is resolved from the named project, not inferred by an LLM

  Scenario: A follow-up note reuses the room's channel
    Given a room is running for the "dark mode" topic
    When a guidance note arrives for that same topic
    Then the orchestrator broadcasts it into the existing channel as Max
    And does not create a second channel or launch new agents

  Scenario: Adding agents grows the existing room
    Given a room is running for the "dark mode" topic
    When two more agents are requested for that topic
    Then the orchestrator launches two more agents into the same channel
    And tells them to join the channel and catch up on history before working

  Scenario: Projects resolve to workspaces
    When a mission targets the "website" project
    Then its agents are launched in the langwatch website workspace
    When a mission targets the "langwatch" project
    Then its agents are launched in the langwatch repository workspace

  Scenario: Room state tracks every agent and its channel
    When agents are launched and working
    Then the orchestrator can list each agent with slug, room topic, channel,
      workspace, busy or idle state, and the latest activity summary

  Scenario: Progress check summarizes the room quickly
    When the voice layer calls check_progress
    Then the orchestrator returns a compact text summary drawn from the
      channel activity and agent state, in under 2 seconds

  Scenario: Room events are observable
    When an agent is launched, instructed, or reports activity
    Then a "tokenmaxxer.fleet" event is emitted for the console to render
