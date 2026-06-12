import { withScenario } from "@langwatch/scenario/integrations/vitest/config";
import VitestReporter from "@langwatch/scenario/integrations/vitest/reporter";
import { defineConfig } from "vitest/config";

export default withScenario(
  defineConfig({
    test: {
      // Real integrations everywhere (Inworld, jimmy, kanban, claude) —
      // generous timeouts and no cross-file parallelism so sessions and
      // tmux agents never trample each other.
      testTimeout: 240_000,
      hookTimeout: 120_000,
      fileParallelism: false,
      maxConcurrency: 2,
      setupFiles: ["dotenv/config"],
      reporters: ["default", new VitestReporter()],
      watch: false,
    },
  }),
);
