"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
(0, core_1.bootstrap)(vendure_config_1.config)
    .then((app) => {
    console.log(`Vendure server listening on port ${vendure_config_1.config.apiOptions?.port ?? 3000}`);
})
    .catch((err) => {
    console.error(err);
    process.exit(1);
});
