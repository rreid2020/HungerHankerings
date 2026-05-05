/**
 * Vendure 2.3.x Job.ensureDataIsSerializable is fragile for EmailPlugin send-email jobs:
 * - Prototype getters can throw (e.g. TypeORM DataSource#mongoManager on Postgres).
 * - Getter values were copied without recursive serialization (nested ORM graphs).
 * - Max depth 10 can truncate deep orders.
 *
 * Replaces ensureDataIsSerializable with a path-stack cycle guard, deeper walk,
 * recursive getter serialization, and try/catch on each branch.
 *
 * Idempotent (marker: hungerhankerings-patch-job-serialization-v2).
 */
const fs = require("fs");
const path = require("path");

const MARKER = "hungerhankerings-patch-job-serialization-v2";

const jobPath = path.join(__dirname, "..", "node_modules", "@vendure", "core", "dist", "job-queue", "job.js");

/** Replace Job.prototype.ensureDataIsSerializable body (brace-balanced). */
function replaceEnsureDataIsSerializable(source) {
  const needle = "    ensureDataIsSerializable(data, depth = 0) {";
  const idx = source.indexOf(needle);
  if (idx === -1) {
    return { ok: false, reason: "ensureDataIsSerializable not found" };
  }
  const braceStart = idx + needle.length - 1;
  if (source[braceStart] !== "{") {
    return { ok: false, reason: "expected '{' at end of method signature" };
  }
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const endClose = i + 1;
        const newMethod = `    ensureDataIsSerializable(data, depth = 0) {
        const MAX_DEPTH = 50;
        const pathStack = [];
        const walk = (value, d) => {
            if (d > MAX_DEPTH) {
                return '[max depth reached]';
            }
            if (value === null || value === undefined) {
                return value;
            }
            const t = typeof value;
            if (t === 'string' || t === 'number' || t === 'boolean') {
                return value;
            }
            if (t === 'bigint') {
                return value.toString();
            }
            if (value instanceof Date) {
                return value.toISOString();
            }
            if (Array.isArray(value)) {
                if (pathStack.includes(value)) {
                    return '[Circular]';
                }
                pathStack.push(value);
                try {
                    return value.map((item) => walk(item, d + 1));
                }
                finally {
                    pathStack.pop();
                }
            }
            if ((0, shared_utils_1.isObject)(value)) {
                if (pathStack.includes(value)) {
                    return '[Circular]';
                }
                pathStack.push(value);
                try {
                    const output = {};
                    for (const key of Object.keys(value)) {
                        try {
                            output[key] = walk(value[key], d + 1);
                        }
                        catch (_hhWalk) {
                            output[key] = void 0;
                        }
                    }
                    if ((0, shared_utils_1.isClassInstance)(value)) {
                        const proto = Object.getPrototypeOf(value);
                        if (proto) {
                            const descriptors = Object.getOwnPropertyDescriptors(proto);
                            for (const name of Object.keys(descriptors)) {
                                const descriptor = descriptors[name];
                                if (typeof descriptor.get === 'function') {
                                    try {
                                        output[name] = walk(value[name], d + 1);
                                    }
                                    catch (_hhGet) {
                                        /* hungerhankerings-patch-job-serialization-v2: skip unsafe getter values */
                                    }
                                }
                            }
                        }
                    }
                    return output;
                }
                finally {
                    pathStack.pop();
                }
            }
            return String(value);
        };
        return walk(data, 0);
    }`;
        return { ok: true, next: source.slice(0, idx) + newMethod + source.slice(endClose) };
      }
    }
  }
  return { ok: false, reason: "could not find closing brace for ensureDataIsSerializable" };
}

function main() {
  if (!fs.existsSync(jobPath)) {
    console.warn("[vendor-patch-vendure-job-serialization] skip: missing", jobPath);
    process.exit(0);
  }
  let s = fs.readFileSync(jobPath, "utf8");
  if (s.includes(MARKER)) {
    console.log("[vendor-patch-vendure-job-serialization] already applied (v2)");
    process.exit(0);
  }

  const r = replaceEnsureDataIsSerializable(s);
  if (!r.ok) {
    console.warn("[vendor-patch-vendure-job-serialization] skip:", r.reason);
    process.exit(0);
  }
  fs.writeFileSync(jobPath, r.next);
  console.log("[vendor-patch-vendure-job-serialization] applied v2 to", jobPath);
}

main();
