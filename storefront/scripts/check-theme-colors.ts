/**
 * Enforces theme color consistency: only semantic tokens and brand-1..5 allowed.
 * Forbidden: arbitrary hex, gray-*, slate-*, and other non-token Tailwind colors.
 * Run in CI and locally: pnpm run check-theme
 */

import * as fs from "fs"
import * as path from "path"

const ROOT = path.join(__dirname, "..")
const SCAN_DIRS = ["app", "components", "styles"]
const EXTENSIONS = [".tsx", ".ts", ".css"]

const FORBIDDEN_PATTERNS = [
  /\btext-\[#/,
  /\bbg-\[#/,
  /\bborder-\[#/,
  /\bring-\[#/,
  /\btext-gray-/,
  /\bbg-gray-/,
  /\bborder-gray-/,
  /\btext-slate-/,
  /\bbg-slate-/,
  /\bborder-slate-/,
  /\btext-red-(?!foreground\b)/,
  /\bbg-red-/,
  /\bborder-red-/,
  /\btext-amber-/,
  /\bbg-amber-/,
  /\btext-emerald-/,
  /\bbg-emerald-/,
  /\btext-rose-/,
  /\bbg-rose-/,
  /\bhover:bg-slate-/,
  /\bhover:text-slate-/,
  /\bfocus:ring-(?!ring\b)[a-z]+-/,
  /\bfocus:border-(?!border\b|input\b|primary\b|ring\b)[a-z]+-/,
  /\b(text-|bg-|border-|ring-|hover:bg-|hover:text-)(sage_green|apricot_cream|cherry_rose|blush_rose|light_coral|cotton_candy|yellow_green)/,
  /\bbrand-(50|100|200|300|400|500|600|700|800|900)\b/
]

const ALLOWLIST_FILES = [
  "styles/theme.css",
  "app/globals.css",
  "scripts/check-theme-colors.ts"
]

function isAllowlisted(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/")
  return ALLOWLIST_FILES.some((a) => normalized.includes(a))
}

function* walkFiles(dir: string, base = ""): Generator<string> {
  const full = path.join(dir, base)
  if (!fs.existsSync(full)) return
  const entries = fs.readdirSync(full, { withFileTypes: true })
  for (const e of entries) {
    const rel = path.join(base, e.name)
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== ".next") {
        yield* walkFiles(dir, rel)
      }
    } else if (EXTENSIONS.some((ext) => e.name.endsWith(ext))) {
      yield rel
    }
  }
}

function checkFile(filePath: string): { line: number; match: string }[] {
  const full = path.join(ROOT, filePath)
  const content = fs.readFileSync(full, "utf-8")
  const lines = content.split("\n")
  const violations: { line: number; match: string }[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const re of FORBIDDEN_PATTERNS) {
      const m = line.match(re)
      if (m) {
        violations.push({ line: i + 1, match: m[0] })
      }
    }
  }
  return violations
}

function main(): void {
  let failed = false
  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(ROOT, dir)
    if (!fs.existsSync(dirPath)) continue
    for (const rel of walkFiles(dirPath, dir)) {
      if (isAllowlisted(rel)) continue
      const violations = checkFile(rel)
      if (violations.length > 0) {
        failed = true
        console.error(`\n${rel}:`)
        for (const v of violations) {
          console.error(`  Line ${v.line}: forbidden pattern "${v.match}"`)
        }
      }
    }
  }
  if (failed) {
    console.error("\nTheme check failed. Use only semantic tokens (see docs/THEME-USAGE.md).")
    process.exit(1)
  }
  console.log("Theme check passed.")
}

main()
