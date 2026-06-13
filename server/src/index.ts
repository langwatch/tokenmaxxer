import "./observability.js";
import { startGateway } from "./gateway/server.js";
import { log } from "./log.js";

startGateway();
log("main", "tokenmaxxer server up — the room is listening");
