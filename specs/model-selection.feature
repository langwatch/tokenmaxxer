Feature: Codegen model selection
  ChatJimmy is the fastest, but it is also the dumbest. For harder pages the
  user may want a smarter model. The codegen model is switchable at runtime
  between chatjimmy, inworld gemma, gemini flash, and anthropic haiku, and the
  trade-off is grounded in a speed-vs-quality benchmark that includes haiku.

  Scenario: The page codegen model is switchable at runtime
    Given the codegen model is "jimmy"
    When the user asks to switch the page model to "haiku"
    Then subsequent write_page and edit_page calls use haiku
    And the choice is reflected to the console

  Scenario: Every model produces a valid page
    When a page is generated with each available model
    Then each output validates as TSX after the same normalization
    And invalid output falls back down the chain as before

  Scenario: The model menu is the measured set
    Then the selectable models are jimmy, inworld-gemma, gemini-flash and haiku
    And each has a recorded latency and quality from the benchmark

  Scenario: The benchmark includes haiku and is reproducible
    Given the codegen benchmark dataset of representative page briefs
    When the benchmark runs across jimmy, gemini-flash, haiku and inworld-gemma
    Then latency and judge-scored quality are recorded per model in LangWatch
    And the default chain order is justified by the numbers

  Scenario: Switching model is a voice tool
    When the user says "use the smart model for pages"
    Then Max calls the set_page_model tool
    And confirms the switch briefly by voice
