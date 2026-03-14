/**
 * Builds the Admin UI with the Shipping rates extension.
 * Run after `pnpm run build`, then start the server.
 */
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { compileUiExtensions } from "@vendure/ui-devkit/compiler";
import { shippingRatesAdminExtension } from "./plugins/shipping-plugin/admin-ui-extension";

const outputPath = path.join(__dirname, "..", "admin-ui");

function findAdminUiPackageJson(): string | null {
  const compilerPath = require.resolve("@vendure/ui-devkit/compiler");
  let dir = path.dirname(compilerPath);
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, "node_modules", "@vendure", "admin-ui", "package.json");
    if (fs.existsSync(p)) return p;
    dir = path.dirname(dir);
  }
  return null;
}

function mergeDepsAndInstall(): Promise<void> {
  const adminUiPkgPath = findAdminUiPackageJson();
  if (!adminUiPkgPath) {
    return Promise.reject(new Error("Could not find @vendure/admin-ui package.json"));
  }
  const adminUiPkg = require(adminUiPkgPath) as { dependencies?: Record<string, string> };
  const scaffoldPkgPath = path.join(outputPath, "package.json");
  const scaffoldPkg = JSON.parse(fs.readFileSync(scaffoldPkgPath, "utf-8")) as {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  scaffoldPkg.version = scaffoldPkg.version || "1.0.0";
  const adminUiVersion = (adminUiPkg as { version?: string }).version || "2.3.3";
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
  fs.writeFileSync(scaffoldPkgPath, JSON.stringify(scaffoldPkg, null, 2), "utf-8");

  return new Promise((resolve, reject) => {
    const proc = spawn("npm", ["install", "--legacy-peer-deps"], {
      cwd: outputPath,
      shell: true,
      stdio: "inherit",
    });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(code)));
  });
}

function runBuild(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npm", ["run", "build"], {
      cwd: outputPath,
      shell: true,
      stdio: "inherit",
    });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(code)));
  });
}

const config = compileUiExtensions({
  outputPath,
  baseHref: "/admin/",
  extensions: [shippingRatesAdminExtension],
  command: "pnpm",
});

config
  .compile?.()
  .then(() => {
    console.log("Admin UI built to", outputPath);
    process.exit(0);
  })
  .catch(async (err: unknown) => {
    if (!fs.existsSync(path.join(outputPath, "package.json"))) {
      console.error("Admin UI build failed (scaffold not created):", err);
      process.exit(1);
    }
    console.log("First build failed (missing deps). Merging dependencies and retrying...");
    try {
      await mergeDepsAndInstall();
      await runBuild();
      console.log("Admin UI built to", outputPath);
      process.exit(0);
    } catch (e) {
      console.error("Admin UI build failed:", e);
      process.exit(1);
    }
  });
