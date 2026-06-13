Feature: Desktop control (the Iron Man layer)
  tokenmaxxer does not live inside a webpage. The gateway runs on the user's
  Mac and drives the real desktop: it pops real browser windows for
  prototypes, opens real Warp terminals running Claude Code for heavy work,
  and surfaces results proactively on top of everything. The listening HUD
  floats above all windows; the work appears around it.

  Background:
    Given the gateway is running on macOS
    And desktop control is enabled

  Scenario: A new page opens as a real positioned browser window
    When write_page creates the page "pricing"
    Then the gateway opens a real browser window at the playground URL "/pricing"
    And the window is positioned to occupy a screen region, not full screen
    And the window is not the listening HUD

  Scenario: Page windows reuse one prototype window per page
    Given a browser window already shows "/pricing"
    When edit_page changes "/pricing"
    Then the same prototype window reloads rather than opening a second window

  Scenario: Opening a page chooses a sensible screen region
    When the user asks to see a page
    Then the prototype window takes a half or a quarter of the screen
    And it does not cover the listening HUD

  Scenario: Heavy work opens a visible Warp terminal with Claude Code
    When dispatch_work routes a mission to a fresh Claude agent
    Then the gateway opens a Warp window
    And inside it a tmux session runs the Claude Code agent for that mission
    And the user can watch the agent work in real time

  Scenario: Warp is preferred but the system degrades gracefully
    Given Warp is not installed
    When a heavy mission is dispatched
    Then the gateway falls back to another terminal (iTerm or Terminal)
    And the agent still launches in a visible tmux session

  Scenario: Completion is proactive, even in silence
    When a dispatched agent finishes its mission
    Then the gateway posts a macOS notification describing what finished
    And if the work produced a pull request, the gateway offers to open it
    And this happens without the user speaking

  Scenario: The listening HUD stays on top
    Then the HUD window floats above all other windows
    And it shows whether the room is listening and what was just done
    And opening prototype or terminal windows never hides the HUD

  Scenario: Desktop control is opt-in and safe in tests and CI
    Given desktop control is disabled
    When any desktop-affecting tool runs
    Then no windows are opened
    And the tool still performs its underlying effect (write the file, spawn the agent)
    And the run is fully headless
