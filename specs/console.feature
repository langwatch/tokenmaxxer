Feature: Meeting console (the room screen)
  The console is the browser app projected in the meeting room. It captures
  the room microphone, plays Max's voice, and visualizes everything the
  system is doing: transcript, tool calls, the agent fleet, and the live
  playground preview.

  Background:
    Given the console is open in a browser
    And the gateway is running

  Scenario: One-click session start
    When the user clicks "start listening"
    Then the microphone is captured with echo cancellation enabled
    And audio streams to the gateway as PCM16 24kHz
    And the connection state is visibly "live"

  Scenario: Max's voice plays as it arrives
    When the gateway forwards agent audio deltas
    Then the console plays them with no audible gaps

  Scenario: Barge-in stops playback instantly
    When the user starts speaking while Max is talking
    Then the console flushes its playback buffer immediately

  Scenario: Live transcript
    When user and agent transcripts arrive
    Then the console renders them as a rolling conversation view

  Scenario: Tool calls are celebrated, not hidden
    When a "tokenmaxxer.tool" event arrives
    Then the console shows the tool, its arguments and its result
      as an activity feed entry within 500ms

  Scenario: Fleet panel shows the swarm
    When "tokenmaxxer.fleet" events arrive
    Then the console shows each agent with slug, mission and live status
    And the panel updates without page refresh

  Scenario: Playground preview follows the conversation
    When a "tokenmaxxer.navigate" event arrives for "/pricing"
    Then the embedded playground preview navigates to "/pricing"

  Scenario: Reconnects without losing the meeting
    When the gateway connection drops
    Then the console reconnects automatically
    And the transcript and fleet panels retain their history
