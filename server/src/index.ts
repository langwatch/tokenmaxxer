import "./observability.js";
import { startGateway } from "./gateway/server.js";
import { ensureJimmyProxy } from "./jimmy/proxy-launcher.js";
import { log } from "./log.js";
import { fleet } from "./orchestrator/fleet.js";

startGateway();
fleet.startWatcher();
void ensureJimmyProxy();
log("main", "tokenmaxxer server up — the room is listening");
