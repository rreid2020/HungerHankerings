"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostalZonePlugin = void 0;
const core_1 = require("@vendure/core");
const postal_zone_api_extensions_1 = require("./api/postal-zone-api.extensions");
const postal_zone_admin_resolver_1 = require("./api/postal-zone-admin.resolver");
const postal_code_zone_entity_1 = require("./entities/postal-code-zone.entity");
const postal_code_zone_service_1 = require("./postal-code-zone.service");
const shipping_rates_ui_controller_1 = require("./shipping-rates-ui.controller");
/**
 * Registers PostalCodeZone entity and PostalCodeZoneService for postal-code–based shipping.
 */
let PostalZonePlugin = class PostalZonePlugin {
};
exports.PostalZonePlugin = PostalZonePlugin;
exports.PostalZonePlugin = PostalZonePlugin = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
        entities: [postal_code_zone_entity_1.PostalCodeZone],
        providers: [postal_code_zone_service_1.PostalCodeZoneService],
        adminApiExtensions: {
            schema: postal_zone_api_extensions_1.postalZoneAdminSchema,
            resolvers: [postal_zone_admin_resolver_1.PostalZoneAdminResolver],
        },
        controllers: [shipping_rates_ui_controller_1.ShippingRatesUiController],
    })
], PostalZonePlugin);
