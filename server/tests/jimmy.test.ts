/**
 * Speed-codegen integration tests — real calls to the jimmy proxy and
 * fallback models, real esbuild validation. Binds specs/playground.feature
 * "write_page creates a complete page in seconds" and "Generated code is
 * validated before being written".
 */
import { describe, expect, it } from "vitest";
import {
  editPageRequest,
  generatePageCode,
  writePageRequest,
} from "../src/jimmy/client.js";
import { wrapBody } from "../src/jimmy/prompts.js";
import { extractJsxBody, validatePage } from "../src/jimmy/validate.js";

describe("extractJsxBody", () => {
  it("passes plain JSX through", () => {
    const jsx = `<div className="min-h-screen">hello</div>`;
    expect(extractJsxBody(jsx)).toBe(jsx);
  });

  it("strips markdown fences", () => {
    const raw = "```tsx\n<div>x</div>\n```";
    expect(extractJsxBody(raw)).toBe("<div>x</div>");
  });

  it("strips prose before and after the JSX", () => {
    const raw = "Sure! Here is the page:\n<div>x</div>\nLet me know!";
    expect(extractJsxBody(raw)).toBe("<div>x</div>");
  });

  it("unwraps a full-file output back to its body", () => {
    const raw = `import React from "react";\n\nexport default function Page() {\n  return (\n    <div>wrapped</div>\n  );\n}\n`;
    expect(extractJsxBody(raw)).toBe("<div>wrapped</div>");
  });
});

describe("validatePage", () => {
  it("accepts a wrapped valid body", async () => {
    const result = await validatePage(wrapBody("<div>ok</div>"));
    expect(result.ok).toBe(true);
  });

  it("rejects broken JSX with a line-numbered error", async () => {
    const result = await validatePage(wrapBody("<div><span></div>"));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/line \d+/);
  });
});

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
