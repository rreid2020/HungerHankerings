"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/admin-ui/core");
exports.default = [
    (0, core_1.addNavMenuItem)({
        id: "shipping-rates",
        label: "Shipping rates",
        routerLink: ["/extensions", "shipping-rates"],
        icon: "truck",
        requiresPermission: "ReadSettings",
    }, "settings"),
];
