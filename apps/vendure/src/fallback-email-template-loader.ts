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
    const readPartialsDir = async (dir: string): Promise<Map<string, string>> => {
      const map = new Map<string, string>();
      let files: string[] = [];
      try {
        files = await fs.readdir(dir);
      } catch {
        return map;
      }
      await Promise.all(
        files
          .filter((f) => f.endsWith(".hbs"))
          .map(async (file) => {
            const name = path.basename(file, ".hbs");
            const content = await fs.readFile(path.join(dir, file), "utf-8");
            map.set(name, content);
          }),
      );
      return map;
    };

    const merged = await readPartialsDir(path.join(this.fallbackDir, "partials"));
    const primary = await readPartialsDir(path.join(this.primaryDir, "partials"));
    for (const [name, content] of primary) {
      merged.set(name, content);
    }
    return Array.from(merged.entries()).map(([name, content]) => ({ name, content }));
  }
}
