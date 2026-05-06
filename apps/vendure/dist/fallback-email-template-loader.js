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
        const partialsPath = path_1.default.join(this.fallbackDir, "partials");
        const files = await fs_1.promises.readdir(partialsPath);
        return Promise.all(files.map(async (file) => ({
            name: path_1.default.basename(file, ".hbs"),
            content: await fs_1.promises.readFile(path_1.default.join(partialsPath, file), "utf-8"),
        })));
    }
}
exports.FallbackEmailTemplateLoader = FallbackEmailTemplateLoader;
