"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPlainShippingLinesForEmail = toPlainShippingLinesForEmail;
function toPlainShippingLinesForEmail(lines) {
    return lines.map((line) => ({
        shippingMethod: { name: line.shippingMethod?.name?.trim() ?? "" },
        price: line.price,
        priceWithTax: line.priceWithTax,
    }));
}
