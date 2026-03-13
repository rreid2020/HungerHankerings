"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingRatesUiController = void 0;
const common_1 = require("@nestjs/common");
const shipping_rates_page_html_1 = require("./shipping-rates-page.html");
/**
 * Serves a simple admin UI for editing postal code zone shipping rates.
 * Open this page while logged in to the Vendure Admin; it uses the same session to call the Admin API.
 */
let ShippingRatesUiController = class ShippingRatesUiController {
    page(res) {
        res.type("text/html").send(shipping_rates_page_html_1.shippingRatesPageHtml);
    }
};
exports.ShippingRatesUiController = ShippingRatesUiController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShippingRatesUiController.prototype, "page", null);
exports.ShippingRatesUiController = ShippingRatesUiController = __decorate([
    (0, common_1.Controller)("shipping-rates")
], ShippingRatesUiController);
