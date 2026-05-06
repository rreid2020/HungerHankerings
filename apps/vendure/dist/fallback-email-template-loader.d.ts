import type { Injector, RequestContext } from "@vendure/core";
import type { TemplateLoader } from "@vendure/email-plugin";
/**
 * Load templates from `primaryDir` first, then fall back to vendure's bundled templates
 * (so we can add custom handlers without copying all default templates).
 */
export declare class FallbackEmailTemplateLoader implements TemplateLoader {
    private readonly primaryDir;
    private readonly fallbackDir;
    constructor(primaryDir: string, fallbackDir: string);
    loadTemplate(_injector: Injector, _ctx: RequestContext, vars: {
        type: string;
        templateName: string;
    }): Promise<string>;
    loadPartials(): Promise<{
        name: string;
        content: string;
    }[]>;
}
//# sourceMappingURL=fallback-email-template-loader.d.ts.map