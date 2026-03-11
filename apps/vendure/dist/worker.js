"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
(0, core_1.bootstrapWorker)(vendure_config_1.config)
    .then((worker) => {
    console.log("Vendure worker started");
})
    .catch((err) => {
    console.error(err);
    process.exit(1);
});
