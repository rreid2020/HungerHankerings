const fs = require("fs")
const path = require("path")
const dir = path.join(__dirname, "..", ".next")
try {
  fs.rmSync(dir, { recursive: true, force: true })
  console.log("Cleaned .next")
} catch (e) {
  if (e.code === "ENOENT") console.log("Nothing to clean")
  else throw e
}
