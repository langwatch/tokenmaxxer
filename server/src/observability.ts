import { getLangWatchTracer } from "langwatch";
import { setupObservability } from "langwatch/observability/node";
import { log } from "./log.js";

if (process.env.LANGWATCH_API_KEY) {
  setupObservability({ serviceName: "tokenmaxxer" });
  log("obs", "langwatch tracing on");
}

export const tracer = getLangWatchTracer("tokenmaxxer");
