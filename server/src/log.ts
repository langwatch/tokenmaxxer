const t0 = Date.now();

export function log(scope: string, message: string, extra?: unknown) {
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1).padStart(7);
  const suffix = extra === undefined ? "" : ` ${JSON.stringify(extra)}`;
  console.log(`[${elapsed}s] [${scope}] ${message}${suffix}`);
}
