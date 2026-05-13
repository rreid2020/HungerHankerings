"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingRatesPageComponent = void 0;
const core_1 = require("@angular/core");
let ShippingRatesPageComponent = class ShippingRatesPageComponent {
};
exports.ShippingRatesPageComponent = ShippingRatesPageComponent;
exports.ShippingRatesPageComponent = ShippingRatesPageComponent = __decorate([
    (0, core_1.Component)({
        selector: "shipping-rates-page",
        standalone: true,
        template: `
    <vdr-page-block>
      <iframe
        src="/shipping-rates"
        title="Shipping rates (postal code zones)"
        style="width: 100%; height: calc(100vh - 180px); min-height: 400px; border: none; border-radius: 4px;"
      ></iframe>
    </vdr-page-block>
  `,
    })
], ShippingRatesPageComponent);
