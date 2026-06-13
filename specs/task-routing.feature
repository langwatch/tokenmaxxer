Feature: Task routing (fast page vs real work)
  Not every request deserves a Claude agent, and not every request should be
  a 17k-token-per-second HTML splat. The orchestrator classifies each spoken
  request and routes it to the cheapest tool that can do it well: visual and
  page-level changes go to a fast code model that edits the prototype site;
  real engineering work goes to a Claude Code session in a visible terminal.

  Scenario: A landing page request is a fast page job
    When the user asks for "a landing page for our cat startup"
    Then the request is classified as a page job
    And it is handled by write_page with the fast code model
    And no Claude agent is spawned

  Scenario: A visual tweak is a fast page job
    When the user asks to "make the hero bigger and add a pricing section"
    Then the request is classified as a page job
    And it is handled by edit_page with the fast code model

  Scenario: Implementing a feature is real work
    When the user asks to "implement a basic login with a backend"
    Then the request is classified as real work
    And it is dispatched to a Claude Code agent in a terminal
    And it is not sent to the fast page model

  Scenario: Research is real work
    When the user asks to "research the market size for cat sitters"
    Then the request is classified as real work
    And it is dispatched to a Claude Code agent

  Scenario: Ambiguous-but-visual leans fast, ambiguous-but-deep leans agent
    When the user asks for "a dashboard that shows our live revenue"
    Then if it reads as a mock or prototype it is a page job
    And if it reads as wiring real data it is real work
    And the classifier explains which signal decided it

  Scenario: The classifier is a fast model and never blocks the conversation
    When a request arrives
    Then classification returns quickly enough to keep the conversation live
    And Max acknowledges by voice without waiting on the heavy path

  Scenario: Classification is proven by scenario tests
    Given a labeled set of representative spoken requests
    When the routing classifier runs over them
    Then page jobs and real-work jobs are separated with high accuracy
