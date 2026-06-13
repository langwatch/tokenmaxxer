import { EventEmitter } from "node:events";
import { config } from "./config.js";
import { log } from "./log.js";
import { PAGE_MODELS, type PageModelId } from "./jimmy/models.js";

/**
 * Runtime-mutable settings the room can change by voice or from the console.
 * Emits "change" so connected clients can reflect the new state.
 */
class Settings extends EventEmitter {
  pageModel: PageModelId = isPageModelId(config.defaultPageModel)
    ? config.defaultPageModel
    : "jimmy";

  setPageModel(id: PageModelId): void {
    if (!PAGE_MODELS[id]) throw new Error(`unknown page model: ${id}`);
    this.pageModel = id;
    log("settings", `page model → ${id}`);
    this.emit("change", { pageModel: this.pageModel });
  }
}

function isPageModelId(value: string | undefined): value is PageModelId {
  return value !== undefined && value in PAGE_MODELS;
}

export const settings = new Settings();
