/**
 * Pure validation/normalization tests — no network, run in CI.
 */
import { describe, expect, it } from "vitest";
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

