Feature: Spinning up rooms of self-organizing agents
  The pivot: the room's voice (Max) turns a spoken request into a swarm of
  Claude Code agents that all land in ONE shared kanban channel and
  coordinate there. The channel IS the agent loop - a natural ralph-loop
  where agents claim slices, review each other, surface issues, and push the
  mission forward without Max micromanaging. One of them can even act as a
  supervisor. Max grows a room, speaks into it, opens a URL on the screen,
  and brings the KanbanCode app forward on the room's channel.

  Background:
    Given the gateway is connected to Inworld with Max's tools
    And the kanban CLI and KanbanCode app are available

  Scenario: A spoken mission spins up a room of agents
    When the team says "get five agents on a full dark mode for the website"
    Then Max calls spawn_room with a mission, the "website" project, and 5 agents
    And a kanban channel is created for the room
    And five Claude agents are launched in tmux in the website workspace
    And each agent is told to join the channel and coordinate before working
    And Max posts the mission into the channel as himself
    And the KanbanCode app is brought forward focused on that channel
    And Max acknowledges in one short spoken sentence

  Scenario: The channel is the agent loop
    Given a room of agents has joined its channel
    Then agents announce what slice they are taking in the channel
    And agents review and unblock each other over the channel
    And no two agents silently work the same file
    And the loop continues without Max issuing per-step instructions

  Scenario: Ten agents tokenmaxxing one mission
    When the team says "throw ten agents at this"
    Then spawn_room launches ten agents into the same channel
    And each agent is an independent Claude session with its own context window
    And the room works the mission in parallel, coordinating in the channel

  Scenario: Agent count defaults when unspecified
    When the team says "spin up a room to redesign the pricing page"
    Then Max calls spawn_room without forcing a count
    And the room launches the default number of agents

  Scenario: Speaking into a room that already exists
    Given a room is already running for the "dark mode" topic
    When the team says "tell them to keep the logo readable on black"
    Then Max calls message_room for that topic
    And the note is broadcast into the existing channel as Max
    And no new agents are launched

  Scenario: Growing a room under load
    Given a room is already running for the "dark mode" topic
    When the team says "throw two more agents at it"
    Then Max calls add_agents for that topic with a count of 2
    And two more Claude agents join the same channel
    And the existing agents are not disturbed

  Scenario: Opening a URL on the room screen
    When the team says "pull up the new website" with the site running
    Then Max calls open_url for the website
    And a real browser window opens at the site URL

  Scenario: Opening a GitHub issue then spinning a room to fix it
    When the team says "open issue 1234 on langwatch"
    Then Max calls open_url for the issue page
    When the team says "get a couple agents to fix it"
    Then Max calls spawn_room for the langwatch project referencing the issue
    And a new channel and its agents are created for the fix

  Scenario: Tearing down a room by voice
    Given a room is already running for the "dark mode" topic
    When the team says "kill the dark mode room"
    Then Max calls close_room for that topic
    And the room's agent tmux sessions are killed
    And the room's channel is deleted
    And Max confirms the room is shut down in one short sentence

  Scenario: Progress comes from the channel, not invented
    Given a room has been chatting in its channel
    When the team asks "how's it going in there?"
    Then Max calls check_progress
    And the report is drawn from the channel history and agent state

  Scenario: Pages and codegen tools are gone
    Then Max has no write_page, edit_page, open_page, or set_page_model tool
    And the room never depends on the jimmy proxy
