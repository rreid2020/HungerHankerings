"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadShippingLinesForEmailPlain = loadShippingLinesForEmailPlain;
const core_1 = require("@vendure/core");
const typeorm_1 = require("typeorm");
const loggerCtx = "EmailShippingLines";
function displayNameForShippingMethod(method, languageCode) {
    const tr = method.translations?.find((t) => t.languageCode === languageCode) ?? method.translations?.[0];
    const name = tr?.name?.trim();
    if (name)
        return name;
    return method.code?.trim() ?? "";
}
/**
 * Resolves shipping method labels for order emails without {@link EntityHydrator}.
 * The stock `hydrateShippingLines` helper merges hydrated relations into the live `Order` graph; when
 * `ShippingLine` ↔ `Order` forms a cycle, Vendure's `mergeDeep` can recurse until stack overflow.
 */
async function loadShippingLinesForEmailPlain(ctx, order, injector) {
    const lines = order.shippingLines ?? [];
    if (lines.length === 0)
        return [];
    const ids = [
        ...new Set(lines
            .map((l) => l.shippingMethodId ?? l.shippingMethod?.id)
            .filter((id) => id != null && `${id}`.length > 0)),
    ].map((id) => `${id}`);
    const nameById = new Map();
    if (ids.length > 0) {
        try {
            const connection = injector.get(core_1.TransactionalConnection);
            const repo = connection.getRepository(ctx, core_1.ShippingMethod);
            const methods = await repo.find({
                where: { id: (0, typeorm_1.In)(ids) },
                relations: ["translations"],
            });
            const lang = String(ctx.languageCode);
            for (const m of methods) {
                nameById.set(`${m.id}`, displayNameForShippingMethod(m, lang));
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            core_1.Logger.warn(`Could not load ShippingMethod names for order email: ${msg}`, loggerCtx);
        }
    }
    return lines
        .filter((line) => line.shippingMethodId != null || line.shippingMethod != null)
        .map((line) => {
        const midRaw = line.shippingMethodId ?? line.shippingMethod?.id;
        const mid = midRaw != null ? `${midRaw}` : "";
        let fallback = "";
        const sm = line.shippingMethod;
        if (sm) {
            fallback = displayNameForShippingMethod(sm, String(ctx.languageCode));
        }
        return {
            shippingMethod: { name: (mid && nameById.get(mid)) || fallback },
            price: line.price,
            priceWithTax: line.priceWithTax,
        };
    });
}
