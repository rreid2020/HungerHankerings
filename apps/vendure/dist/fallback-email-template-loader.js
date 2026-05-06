"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackEmailTemplateLoader = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
/**
 * Load templates from `primaryDir` first, then fall back to vendure's bundled templates
 * (so we can add custom handlers without copying all default templates).
 */
class FallbackEmailTemplateLoader {
    constructor(primaryDir, fallbackDir) {
        this.primaryDir = primaryDir;
        this.fallbackDir = fallbackDir;
    }
    async loadTemplate(_injector, _ctx, vars) {
        const rel = path_1.default.join(vars.type, vars.templateName);
        const primaryPath = path_1.default.join(this.primaryDir, rel);
        try {
            return await fs_1.promises.readFile(primaryPath, "utf-8");
        }
        catch {
            return fs_1.promises.readFile(path_1.default.join(this.fallbackDir, rel), "utf-8");
        }
    }
    async loadPartials() {
        const readPartialsDir = async (dir) => {
            const map = new Map();
            let files = [];
            try {
                files = await fs_1.promises.readdir(dir);
            }
            catch {
                return map;
            }
            await Promise.all(files
                .filter((f) => f.endsWith(".hbs"))
                .map(async (file) => {
                const name = path_1.default.basename(file, ".hbs");
                const content = await fs_1.promises.readFile(path_1.default.join(dir, file), "utf-8");
                map.set(name, content);
            }));
            return map;
        };
        const merged = await readPartialsDir(path_1.default.join(this.fallbackDir, "partials"));
        const primary = await readPartialsDir(path_1.default.join(this.primaryDir, "partials"));
        for (const [name, content] of primary) {
            merged.set(name, content);
        }
        return Array.from(merged.entries()).map(([name, content]) => ({ name, content }));
    }
}
exports.FallbackEmailTemplateLoader = FallbackEmailTemplateLoader;
