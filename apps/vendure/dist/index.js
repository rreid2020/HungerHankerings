"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
const run_startup_ensures_1 = require("./run-startup-ensures");
(0, run_startup_ensures_1.runStartupEnsures)()
    .then(() => (0, core_1.bootstrap)(vendure_config_1.config))
    .then(() => {
    console.log(`Vendure server listening on port ${vendure_config_1.config.apiOptions?.port ?? 3000}`);
})
    .catch((err) => {
    console.error(err);
    process.exit(1);
});
