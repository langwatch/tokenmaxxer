/**
 * Page-model selection: runtime switching (unit) and a real generation from
 * every available model (integration — proves each produces valid TSX).
 * Binds specs/model-selection.feature.
 */
import { afterEach, describe, expect, it } from "vitest";
import { generatePageCode, speedChain, writePageRequest } from "../src/jimmy/client.js";
import { PAGE_MODELS, type PageModelId } from "../src/jimmy/models.js";
import { wrapBody } from "../src/jimmy/prompts.js";
import { extractJsxBody, validatePage } from "../src/jimmy/validate.js";
import { settings } from "../src/settings.js";

const original = settings.pageModel;
afterEach(() => settings.setPageModel(original));

describe("page model selection", () => {
  it("puts the selected model first in the chain", () => {
    settings.setPageModel("haiku");
    expect(speedChain()[0].id).toBe("haiku");
    settings.setPageModel("jimmy");
    expect(speedChain()[0].id).toBe("jimmy");
  });

  it("keeps smart fallbacks after the primary, without duplicating it", () => {
    settings.setPageModel("gemini-flash");
    const ids = speedChain().map((m) => m.id);
    expect(ids[0]).toBe("gemini-flash");
    expect(ids.filter((id) => id === "gemini-flash").length).toBe(1);
  });

  it("rejects an unknown model", () => {
    expect(() => settings.setPageModel("nope" as PageModelId)).toThrow();
  });

  it("the menu is the measured set", () => {
    for (const id of ["jimmy", "gemini-flash", "haiku", "inworld-gemma"] as const) {
      expect(PAGE_MODELS[id]).toBeDefined();
    }
  });
});

describe("every available model produces a valid page", () => {
  const candidates: PageModelId[] = [
    "jimmy",
    "gemini-flash",
    "haiku",
    "inworld-gemma",
  ];
  for (const id of candidates) {
    const model = PAGE_MODELS[id];
    it.skipIf(!model.available())(`${id} writes valid TSX`, async () => {
      settings.setPageModel(id);
      const result = await generatePageCode(
        writePageRequest(
          "coming-soon",
          "A minimal coming-soon page for a startup called Nimbus with a " +
            "headline and an email signup.",
        ),
        40_000,
      );
      expect((await validatePage(result.code)).ok).toBe(true);
      expect(result.code).toContain("export default function Page()");
      console.log(`${id}: page via ${result.model} in ${result.elapsedMs}ms`);
    }, 60_000);
  }

  it("normalizes a full-file response from any model back to a page", async () => {
    // The chain wraps a JSX body; ensure a model that returns a whole file
    // is still normalized correctly.
    const fullFile = `import React from "react";\nexport default function Page(){return (<div className="min-h-screen">hi</div>);}`;
    expect((await validatePage(wrapBody(extractJsxBody(fullFile)))).ok).toBe(true);
  });
});
