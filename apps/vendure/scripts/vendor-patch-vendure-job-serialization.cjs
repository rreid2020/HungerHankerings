/**
 * Vendure 2.3.x Job.ensureDataIsSerializable evaluates every prototype getter on class instances.
 * TypeORM entities / relations can surface DataSource#get mongoManager, which throws on Postgres
 * ("MongoEntityManager is only available for MongoDB databases"), breaking send-email jobs.
 * Wrap serialization in try/catch so order confirmation + ops inbox emails can queue.
 *
 * Idempotent; safe to run on every postinstall. Skip if @vendure/core layout changes.
 */
const fs = require("fs");
const path = require("path");

const MARKER = "hungerhankerings-patch-job-serialization";

const jobPath = path.join(__dirname, "..", "node_modules", "@vendure", "core", "dist", "job-queue", "job.js");

function main() {
  if (!fs.existsSync(jobPath)) {
    console.warn("[vendor-patch-vendure-job-serialization] skip: missing", jobPath);
    process.exit(0);
  }
  let s = fs.readFileSync(jobPath, "utf8");
  if (s.includes(MARKER)) {
    console.log("[vendor-patch-vendure-job-serialization] already applied");
    process.exit(0);
  }

  const legacyBlock = `            for (const key of Object.keys(data)) {
                output[key] = this.ensureDataIsSerializable(data[key], depth);
            }
            if ((0, shared_utils_1.isClassInstance)(data)) {
                const descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(data));
                for (const name of Object.keys(descriptors)) {
                    const descriptor = descriptors[name];
                    if (typeof descriptor.get === 'function') {
                        output[name] = data[name];
                    }
                }
            }`;

  const patchedBlock = `            for (const key of Object.keys(data)) {
                try {
                    output[key] = this.ensureDataIsSerializable(data[key], depth);
                } catch (_hhSer) {
                    output[key] = void 0;
                }
            }
            if ((0, shared_utils_1.isClassInstance)(data)) {
                const descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(data));
                for (const name of Object.keys(descriptors)) {
                    const descriptor = descriptors[name];
                    if (typeof descriptor.get === 'function') {
                        try {
                            output[name] = data[name];
                        } catch (_hhSer2) {
                            /* ${MARKER}: skip unsafe getters during job serialization */
                        }
                    }
                }
            }`;

  if (!s.includes(legacyBlock)) {
    console.warn(
      "[vendor-patch-vendure-job-serialization] skip: expected ensureDataIsSerializable block not found (different @vendure/core build?)",
    );
    process.exit(0);
  }
  s = s.replace(legacyBlock, patchedBlock);

  const legacyForEach = `            data.forEach((item, i) => {
                output[i] = this.ensureDataIsSerializable(item, depth);
            });`;
  const patchedForEach = `            data.forEach((item, i) => {
                try {
                    output[i] = this.ensureDataIsSerializable(item, depth);
                } catch (_hhSer3) {
                    output[i] = void 0;
                }
            });`;
  if (s.includes(legacyForEach)) {
    s = s.replace(legacyForEach, patchedForEach);
  }

  fs.writeFileSync(jobPath, s);
  console.log("[vendor-patch-vendure-job-serialization] applied to", jobPath);
}

main();
