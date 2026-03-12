"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
// Prevent running Vendure migrations against a Saleor or default DB by mistake
const dbName = (process.env.DB_NAME ?? "vendure").toLowerCase();
const forbiddenDbNames = ["saleor", "defaultdb"];
if (forbiddenDbNames.includes(dbName)) {
    console.error(`[migrate] Refusing to run: DB_NAME is "${process.env.DB_NAME}". Vendure migrations must not target the Saleor or default database. Set DB_NAME to a dedicated database (e.g. vendure) in the .env used by this process (e.g. project root .env on the droplet, or apps/vendure/.env when running locally).`);
    process.exit(1);
}
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
