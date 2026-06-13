Feature: Desktop control (the Iron Man layer)
  tokenmaxxer does not live inside a webpage. The gateway runs on the user's
  Mac and drives the real desktop: it pops real browser windows for URLs,
  opens real terminals running Claude Code agents, keeps the KanbanCode app
  pinned and focused on the room of the moment, and surfaces results
  proactively. The listening HUD floats above everything; the work tiles
  around it - browser top-right, the KanbanCode board top-left, agent
  terminals fanning out along the bottom.

  Background:
    Given the gateway is running on macOS
    And desktop control is enabled

  Scenario: open_url opens a real positioned browser window
    When open_url is called with a site or issue address
    Then the gateway opens a real browser window at that address
    And the window is positioned to occupy a screen region, not full screen
    And the window is not the listening HUD

  Scenario: One screen window is reused as the URL changes
    Given a browser window already shows a URL
    When open_url navigates to a different URL
    Then the same window points at the new address rather than opening a second

  Scenario: A room's agents open visible terminals running Claude Code
    When a room launches its agents
    Then the gateway opens a terminal window per agent
    And inside each a tmux session runs the Claude Code agent
    And the user can watch the agents work and chat in their channel live
    And the terminals fan out so more become visible as the room grows

  Scenario: The KanbanCode app is pinned and focused on the room channel
    When a room is created or grown
    Then the gateway brings the KanbanCode app forward on the room's channel
    And the app is positioned in the top-left region of the screen

  Scenario: Terminals degrade gracefully when Warp is absent
    Given Warp is not installed
    When a room is dispatched
    Then the gateway falls back to another terminal (iTerm or Terminal)
    And each agent still launches in a visible tmux session

  Scenario: Completion is proactive, even in silence
    When an agent in a room finishes its slice
    Then the gateway posts a macOS notification describing what finished
    And if the work produced a pull request, the gateway offers to open it
    And this happens without the user speaking

  Scenario: The listening HUD stays on top
    Then the HUD window floats above all other windows
    And it shows whether the room is listening and what was just done
    And opening browser or terminal windows never hides the HUD

  Scenario: Desktop control is opt-in and safe in tests and CI
    Given desktop control is disabled
    When any desktop-affecting tool runs
    Then no windows are opened
    And the tool still performs its underlying effect (launch the agents, post the message)
    And the run is fully headless
