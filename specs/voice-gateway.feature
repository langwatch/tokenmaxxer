Feature: Voice Gateway
  The gateway is a WebSocket server that exposes an OpenAI Realtime-compatible
  endpoint to clients (the meeting console and scenario tests) and proxies a
  single voice session to the Inworld Realtime API upstream. It owns the
  session configuration (persona, tools, model) and executes tool calls
  server-side so the conversation never leaves the room.

  Background:
    Given the gateway is running with INWORLD_API_KEY configured
    And a client connects to the gateway WebSocket endpoint at "/realtime"

  Scenario: Client connect handshake
    Then the client receives a "session.created" event
    And the gateway opens an upstream connection to Inworld
    And the gateway sends the server-owned session configuration upstream

  Scenario: Server owns the session configuration
    When the client sends a "session.update" with its own model and instructions
    Then the gateway forwards the update upstream with the server-owned
      model, instructions, voice and tools forced over the client values
    And client-chosen "turn_detection" is preserved so tests can drive
      manual turn-taking while the console uses semantic VAD
    And the client receives a "session.updated" event

  Scenario: Audio flows both ways
    When the client streams "input_audio_buffer.append" events with PCM16 audio
    Then the gateway forwards them upstream unchanged
    When upstream emits "response.output_audio.delta" events
    Then the client receives them unchanged

  Scenario: Transcripts are forwarded
    When upstream emits user or agent transcript events
    Then the client receives the same transcript events
    And the gateway records them in the meeting transcript log

  Scenario: User interrupts the agent
    When upstream emits "input_audio_buffer.speech_started"
    Then the client receives the event so it can flush its playback buffer

  Scenario: Tool calls are executed server-side without blocking speech
    When upstream emits "response.function_call_arguments.done" for tool "dispatch_work"
    Then the gateway executes the tool handler
    And sends a "conversation.item.create" with the function_call_output upstream
    And sends "response.create" so the agent can speak the acknowledgement
    And the tool result is produced in under 2 seconds even though the
      underlying work continues in the background

  Scenario: Tool activity is observable by clients
    When any tool call starts and finishes
    Then connected clients receive "tokenmaxxer.tool" events
      with the tool name, arguments and result summary

  Scenario: Upstream disconnect is surfaced and recovered
    When the upstream Inworld connection drops
    Then the gateway attempts to reconnect with backoff
    And re-sends the session configuration after reconnecting
    And the client receives a "tokenmaxxer.status" event describing the reconnection
