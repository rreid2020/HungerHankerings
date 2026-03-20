"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Builds the Admin UI with the Shipping rates extension.
 * Run after `pnpm run build`, then start the server.
 */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const compiler_1 = require("@vendure/ui-devkit/compiler");
const admin_ui_extension_1 = require("./plugins/shipping-plugin/admin-ui-extension");
const outputPath = path_1.default.join(__dirname, "..", "admin-ui");
function findAdminUiPackageJson() {
    const compilerPath = require.resolve("@vendure/ui-devkit/compiler");
    let dir = path_1.default.dirname(compilerPath);
    for (let i = 0; i < 6; i++) {
        const p = path_1.default.join(dir, "node_modules", "@vendure", "admin-ui", "package.json");
        if (fs_1.default.existsSync(p))
            return p;
        dir = path_1.default.dirname(dir);
    }
    return null;
}
function mergeDepsAndInstall() {
    const adminUiPkgPath = findAdminUiPackageJson();
    if (!adminUiPkgPath) {
        return Promise.reject(new Error("Could not find @vendure/admin-ui package.json"));
    }
    const adminUiPkg = require(adminUiPkgPath);
    const scaffoldPkgPath = path_1.default.join(outputPath, "package.json");
    const scaffoldPkg = JSON.parse(fs_1.default.readFileSync(scaffoldPkgPath, "utf-8"));
    scaffoldPkg.version = scaffoldPkg.version || "1.0.0";
    const adminUiVersion = adminUiPkg.version || "2.3.3";
    scaffoldPkg.dependencies = {
        "@vendure/admin-ui": adminUiVersion,
        ...adminUiPkg.dependencies,
    };
    scaffoldPkg.devDependencies = {
        "@angular-devkit/build-angular": "~17.2.0",
        "@angular/cli": "~17.2.0",
        "@angular/compiler": "^17.2.4",
        "@angular/compiler-cli": "^17.2.4",
        "typescript": "~5.2.0",
        ...scaffoldPkg.devDependencies,
    };
    fs_1.default.writeFileSync(scaffoldPkgPath, JSON.stringify(scaffoldPkg, null, 2), "utf-8");
    return new Promise((resolve, reject) => {
        const proc = (0, child_process_1.spawn)("npm", ["install", "--legacy-peer-deps"], {
            cwd: outputPath,
            shell: true,
            stdio: "inherit",
        });
        proc.on("close", (code) => (code === 0 ? resolve() : reject(code)));
    });
}
function runBuild() {
    return new Promise((resolve, reject) => {
        const proc = (0, child_process_1.spawn)("npm", ["run", "build"], {
            cwd: outputPath,
            shell: true,
            stdio: "inherit",
        });
        proc.on("close", (code) => (code === 0 ? resolve() : reject(code)));
    });
}
const config = (0, compiler_1.compileUiExtensions)({
    outputPath,
    baseHref: "/admin/",
    extensions: [admin_ui_extension_1.shippingRatesAdminExtension],
    command: "pnpm",
});
config
    .compile?.()
    .then(() => {
    console.log("Admin UI built to", outputPath);
    process.exit(0);
})
    .catch(async (err) => {
    if (!fs_1.default.existsSync(path_1.default.join(outputPath, "package.json"))) {
        console.error("Admin UI build failed (scaffold not created):", err);
        process.exit(1);
    }
    console.log("First build failed (missing deps). Merging dependencies and retrying...");
    try {
        await mergeDepsAndInstall();
        await runBuild();
        console.log("Admin UI built to", outputPath);
        process.exit(0);
    }
    catch (e) {
        console.error("Admin UI build failed:", e);
        process.exit(1);
    }
});
