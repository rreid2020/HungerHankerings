"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
(0, core_1.runMigrations)(vendure_config_1.config)
    .then((migrations) => {
    if (migrations.length) {
        console.log("Ran migrations:", migrations);
    }
    else {
        console.log("No pending migrations.");
    }
    process.exit(0);
})
    .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
