/**
 * Speed-codegen integration tests — real calls to the jimmy proxy and
 * fallback models, real esbuild validation. Binds specs/playground.feature.
 */
import { describe, expect, it } from "vitest";
import {
  editPageRequest,
  generatePageCode,
  writePageRequest,
} from "../src/jimmy/client.js";
import { wrapBody } from "../src/jimmy/prompts.js";
import { validatePage } from "../src/jimmy/validate.js";

describe("speed chain (real models)", () => {
  it("generates a complete valid pricing page", async () => {
    const result = await generatePageCode(
      writePageRequest(
        "pricing",
        "Pricing page for CatSit, an airbnb for cat sitters. Three tiers: " +
          "Basic $9, Pro $29 (highlighted), Team $99, each with a feature " +
          "list and a call-to-action button. Dark, premium aesthetic.",
      ),
    );
    expect(result.code).toContain("export default function Page()");
    expect(result.code).toContain("className=");
    expect((await validatePage(result.code)).ok).toBe(true);
    // The whole point: spoken request → page in seconds.
    expect(result.elapsedMs).toBeLessThan(45_000);
    console.log(
      `pricing page via ${result.model} in ${result.elapsedMs}ms (${result.attempts} attempts)`,
    );
  });

  it("edits an existing page preserving untouched content", async () => {
    const original = wrapBody(
      `<div className="min-h-screen bg-zinc-950 text-zinc-100">
  <h1 className="text-5xl font-black">CatSit</h1>
  <p className="text-zinc-400">Cat sitting, reinvented.</p>
</div>`,
    );
    const result = await generatePageCode(
      editPageRequest(
        "about",
        "Add a section titled 'Our story' with one short paragraph. Keep the heading and tagline.",
        original,
      ),
    );
    expect((await validatePage(result.code)).ok).toBe(true);
    expect(result.code).toContain("CatSit");
    expect(result.code.toLowerCase()).toContain("our story");
  });
});
