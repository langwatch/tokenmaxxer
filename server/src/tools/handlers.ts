import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import {
  editPageRequest,
  generatePageCode,
  writePageRequest,
} from "../jimmy/client.js";
import { log } from "../log.js";
import { fleet } from "../orchestrator/fleet.js";

export interface ToolOutcome {
  output: Record<string, unknown>;
  /** Side-effect for clients, e.g. navigate the room screen. */
  navigate?: string;
}

type Handler = (args: Record<string, unknown>) => Promise<ToolOutcome>;

function slugify(raw: string): string {
  const slug = String(raw)
    .toLowerCase()
    .replace(/\.tsx$/, "")
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error(`unusable page path: ${raw}`);
  return slug;
}

function pageFile(slug: string): string {
  return path.join(config.playgroundDir, "src", "pages", `${slug}.tsx`);
}

const handlers: Record<string, Handler> = {
  async dispatch_work(args) {
    const mission = String(args.mission ?? "");
    const topic = String(args.topic ?? "untitled work");
    if (!mission) throw new Error("dispatch_work needs a mission");
    const note = fleet.dispatch(mission, topic);
    return { output: { status: "dispatched", note } };
  },

  async check_progress() {
    return { output: { report: fleet.progressReport() } };
  },

  async write_page(args) {
    const slug = slugify(String(args.path ?? ""));
    if (slug === "home") {
      return {
        output: {
          status: "protected",
          note:
            "/home is the site index and cannot be overwritten. Call " +
            "write_page again with a descriptive new slug (e.g. " +
            "'purrbnb-landing').",
        },
      };
    }
    const description = String(args.description ?? "");
    const result = await generatePageCode(writePageRequest(slug, description));
    fs.mkdirSync(path.dirname(pageFile(slug)), { recursive: true });
    fs.writeFileSync(pageFile(slug), result.code);
    log("tools", `write_page /${slug} via ${result.model} in ${result.elapsedMs}ms`);
    return {
      output: {
        status: "live",
        page: `/${slug}`,
        note:
          `Page is on the room screen (generated in ${(result.elapsedMs / 1000).toFixed(1)}s). ` +
          "Confirm briefly; do not call page tools again unless the team asks for more.",
      },
      navigate: `/${slug}`,
    };
  },

  async edit_page(args) {
    const slug = slugify(String(args.path ?? ""));
    const instructions = String(args.instructions ?? "");
    const file = pageFile(slug);
    if (!fs.existsSync(file)) {
      const pages = listPages();
      return {
        output: {
          status: "not_found",
          note: `No page "/${slug}". Existing pages: ${pages.join(", ") || "(none)"}. Use write_page for new pages.`,
        },
      };
    }
    const currentCode = fs.readFileSync(file, "utf8");
    const result = await generatePageCode(
      editPageRequest(slug, instructions, currentCode),
    );
    fs.writeFileSync(file, result.code);
    log("tools", `edit_page /${slug} via ${result.model} in ${result.elapsedMs}ms`);
    return {
      output: {
        status: "live",
        page: `/${slug}`,
        note: `Edit is on the room screen (${(result.elapsedMs / 1000).toFixed(1)}s).`,
      },
      navigate: `/${slug}`,
    };
  },

  async open_page(args) {
    const raw = String(args.path ?? "home");
    const slug = raw === "home" || raw === "/" ? "" : slugify(raw);
    if (slug && !fs.existsSync(pageFile(slug))) {
      // Teach the model instead of pretending: it will self-correct to
      // write_page in the same conversation.
      const pages = listPages();
      return {
        output: {
          status: "not_found",
          note:
            `No page "/${slug}" exists yet. Existing pages: ` +
            `${pages.join(", ") || "(none)"}. Call write_page to create it.`,
        },
      };
    }
    return {
      output: { status: "shown", page: `/${slug}` },
      navigate: `/${slug}`,
    };
  },
};

function listPages(): string[] {
  try {
    return fs
      .readdirSync(path.join(config.playgroundDir, "src", "pages"))
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => `/${f.replace(/\.tsx$/, "")}`);
  } catch {
    return [];
  }
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolOutcome> {
  const handler = handlers[name];
  if (!handler) throw new Error(`unknown tool: ${name}`);
  return handler(args);
}
