"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shippingRatesAdminExtension = void 0;
const path_1 = __importDefault(require("path"));
const extensionPath = path_1.default.join(__dirname, "ui");
exports.shippingRatesAdminExtension = {
    extensionPath,
    routes: [{ route: "shipping-rates", filePath: "routes.ts" }],
    providers: ["providers.ts"],
};
