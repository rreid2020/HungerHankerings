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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostalCodeZone = void 0;
const core_1 = require("@vendure/core");
const typeorm_1 = require("typeorm");
/**
 * Shipping zone by 3-character postal prefix (Canadian FSA) or country default.
 * You set your own rate per zone. Optional city/region for display; lookup uses prefix only.
 */
let PostalCodeZone = class PostalCodeZone extends core_1.VendureEntity {
    constructor(input) {
        super(input);
    }
};
exports.PostalCodeZone = PostalCodeZone;
__decorate([
    (0, typeorm_1.Column)({ length: 2 }),
    __metadata("design:type", String)
], PostalCodeZone.prototype, "countryCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 6, default: "" }),
    __metadata("design:type", String)
], PostalCodeZone.prototype, "prefix", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 128 }),
    __metadata("design:type", String)
], PostalCodeZone.prototype, "zoneName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 128, nullable: true }),
    __metadata("design:type", Object)
], PostalCodeZone.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 128, nullable: true }),
    __metadata("design:type", Object)
], PostalCodeZone.prototype, "region", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], PostalCodeZone.prototype, "rateCents", void 0);
exports.PostalCodeZone = PostalCodeZone = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], PostalCodeZone);
