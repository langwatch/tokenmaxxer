import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config } from "../config.js";
import { log } from "../log.js";

const PROXY_DIR =
  process.env.JIMMY_PROXY_DIR ??
  path.join(os.homedir(), "Projects", "jimmy-proxy");

/**
 * The demo must never die because someone forgot a terminal: if the jimmy
 * proxy isn't reachable, start it ourselves (it's a single python file).
 */
export async function ensureJimmyProxy(): Promise<void> {
  if (await healthy()) {
    log("jimmy", `proxy already up at ${config.jimmyProxyUrl}`);
    return;
  }
  const proxyScript = path.join(PROXY_DIR, "proxy.py");
  if (!fs.existsSync(proxyScript)) {
    log("jimmy", `proxy not running and ${proxyScript} not found — speed chain will use fallbacks`);
    return;
  }
  const port = new URL(config.jimmyProxyUrl).port || "4100";
  log("jimmy", `starting proxy: python3 proxy.py --port ${port}`);
  const child = spawn("python3", ["proxy.py", "--port", port], {
    cwd: PROXY_DIR,
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 300));
    if (await healthy()) {
      log("jimmy", "proxy is up");
      return;
    }
  }
  log("jimmy", "proxy did not come up — speed chain will use fallbacks");
}

async function healthy(): Promise<boolean> {
  try {
    const res = await fetch(`${config.jimmyProxyUrl}/models`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}
