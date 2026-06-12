import { transform } from "esbuild";

/**
 * Normalize raw model output into a JSX body: strip markdown fences,
 * prose preambles, and full-file scaffolding (imports / function wrapper /
 * export) that some models add despite the body-only instruction.
 */
export function extractJsxBody(raw: string): string {
  let code = raw.trim();
  const fence = code.match(/```(?:tsx|typescript|jsx|ts|js|html)?\n([\s\S]*?)```/);
  if (fence) code = fence[1].trim();

  // Full-file output: pull the return (...) body out of the wrapper.
  if (/export default/.test(code)) {
    const ret = code.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*}\s*;?\s*$/);
    if (ret) return ret[1].trim();
  }

  // Drop anything before the first JSX tag (prose, stray imports).
  const firstTag = code.indexOf("<");
  if (firstTag > 0) code = code.slice(firstTag);
  // Drop anything after the last closing tag.
  const lastTag = code.lastIndexOf(">");
  if (lastTag >= 0 && lastTag < code.length - 1) code = code.slice(0, lastTag + 1);
  return code.trim();
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** A page file is valid when esbuild parses it as TSX. */
export async function validatePage(code: string): Promise<ValidationResult> {
  if (!/export default/.test(code)) {
    return { ok: false, error: "missing `export default`" };
  }
  try {
    await transform(code, { loader: "tsx", jsx: "automatic" });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: esbuildErrorSummary(err) };
  }
}

function esbuildErrorSummary(err: unknown): string {
  const e = err as { errors?: { text: string; location?: { line: number } }[] };
  if (Array.isArray(e.errors) && e.errors.length > 0) {
    return e.errors
      .slice(0, 3)
      .map((m) => `line ${m.location?.line ?? "?"}: ${m.text}`)
      .join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}
