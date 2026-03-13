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
exports.PostalZoneAdminResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const core_1 = require("@vendure/core");
const postal_code_zone_service_1 = require("../postal-code-zone.service");
let PostalZoneAdminResolver = class PostalZoneAdminResolver {
    constructor(postalZoneService) {
        this.postalZoneService = postalZoneService;
    }
    postalCodeZones(ctx) {
        return this.postalZoneService.findAll(ctx);
    }
    updatePostalCodeZone(ctx, id, rateCents) {
        return this.postalZoneService.updateRate(ctx, id, rateCents);
    }
};
exports.PostalZoneAdminResolver = PostalZoneAdminResolver;
__decorate([
    (0, core_1.Allow)(core_1.Permission.ReadSettings),
    (0, graphql_1.Query)(),
    __param(0, (0, core_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext]),
    __metadata("design:returntype", Promise)
], PostalZoneAdminResolver.prototype, "postalCodeZones", null);
__decorate([
    (0, core_1.Allow)(core_1.Permission.UpdateSettings),
    (0, core_1.Transaction)(),
    (0, graphql_1.Mutation)(),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)("id")),
    __param(2, (0, graphql_1.Args)("rateCents")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, String, Number]),
    __metadata("design:returntype", Promise)
], PostalZoneAdminResolver.prototype, "updatePostalCodeZone", null);
exports.PostalZoneAdminResolver = PostalZoneAdminResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [postal_code_zone_service_1.PostalCodeZoneService])
], PostalZoneAdminResolver);
