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
exports.PostalZoneShopResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const core_1 = require("@vendure/core");
const postal_code_zone_service_1 = require("../postal-code-zone.service");
const FALLBACK_RATE_CENTS = 1200;
let PostalZoneShopResolver = class PostalZoneShopResolver {
    constructor(postalZoneService) {
        this.postalZoneService = postalZoneService;
    }
    async shippingQuote(ctx, countryCode, postalCode) {
        const country = (countryCode ?? "").trim().toUpperCase().slice(0, 2);
        const postal = (postalCode ?? "").trim().toUpperCase().replace(/\s/g, "");
        const cents = (await this.postalZoneService.getAdminRateCentsByPostal(country, postal, 0))?.rateCents ??
            (await this.postalZoneService.getRateCentsByPostal(ctx, country, postal)) ??
            FALLBACK_RATE_CENTS;
        return cents;
    }
};
exports.PostalZoneShopResolver = PostalZoneShopResolver;
__decorate([
    (0, graphql_1.Query)(),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)("countryCode")),
    __param(2, (0, graphql_1.Args)("postalCode")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, String, String]),
    __metadata("design:returntype", Promise)
], PostalZoneShopResolver.prototype, "shippingQuote", null);
exports.PostalZoneShopResolver = PostalZoneShopResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [postal_code_zone_service_1.PostalCodeZoneService])
], PostalZoneShopResolver);
