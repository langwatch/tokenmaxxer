Feature: Observability
  Every LLM decision in the system is traced to LangWatch so the demo can
  show the machinery behind the magic, and so prompt experiments are
  grounded in data.

  Scenario: Orchestrator brain calls are traced
    When the orchestrator brain makes a spawn-or-reuse decision
    Then a LangWatch trace records the input fleet state, the mission
      and the structured decision

  Scenario: Speed-model codegen calls are traced
    When write_page or edit_page generates code
    Then a LangWatch trace records the model used, latency and validation outcome

  Scenario: Voice sessions produce scenario results
    When the voice scenario suite runs
    Then results appear in LangWatch simulations with audio attached
