"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/admin-ui/core");
const shipping_rates_page_component_1 = require("./shipping-rates-page.component");
exports.default = [
    (0, core_1.registerRouteComponent)({
        path: "",
        component: shipping_rates_page_component_1.ShippingRatesPageComponent,
        breadcrumb: "Shipping rates",
    }),
];
