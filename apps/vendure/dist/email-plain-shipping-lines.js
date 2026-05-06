"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPlainShippingLinesForEmail = toPlainShippingLinesForEmail;
/** Maps hydrated shipping lines (e.g. from tests) into the plain email shape. */
function toPlainShippingLinesForEmail(lines) {
    return lines.map((line) => ({
        shippingMethod: { name: line.shippingMethod?.name?.trim() ?? "" },
        price: line.price,
        priceWithTax: line.priceWithTax,
    }));
}
