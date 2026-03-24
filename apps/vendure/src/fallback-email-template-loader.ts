import { promises as fs } from "fs";
import path from "path";
import type { Injector, RequestContext } from "@vendure/core";
import type { TemplateLoader } from "@vendure/email-plugin";

/**
 * Load templates from `primaryDir` first, then fall back to vendure's bundled templates
 * (so we can add custom handlers without copying all default templates).
 */
export class FallbackEmailTemplateLoader implements TemplateLoader {
  constructor(
    private readonly primaryDir: string,
    private readonly fallbackDir: string,
  ) {}

  async loadTemplate(
    _injector: Injector,
    _ctx: RequestContext,
    vars: { type: string; templateName: string },
  ): Promise<string> {
    const rel = path.join(vars.type, vars.templateName);
    const primaryPath = path.join(this.primaryDir, rel);
    try {
      return await fs.readFile(primaryPath, "utf-8");
    } catch {
      return fs.readFile(path.join(this.fallbackDir, rel), "utf-8");
    }
  }

  async loadPartials() {
    const partialsPath = path.join(this.fallbackDir, "partials");
    const files = await fs.readdir(partialsPath);
    return Promise.all(
      files.map(async (file) => ({
        name: path.basename(file, ".hbs"),
        content: await fs.readFile(path.join(partialsPath, file), "utf-8"),
      })),
    );
  }
}
