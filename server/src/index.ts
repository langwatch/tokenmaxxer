import { startGateway } from "./gateway/server.js";
import { log } from "./log.js";
import { fleet } from "./orchestrator/fleet.js";

startGateway();
fleet.startWatcher();
log("main", "tokenmaxxer server up — the room is listening");
