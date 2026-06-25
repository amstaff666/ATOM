/**
 * Fix corrupted @reactflow/core installs missing dist/esm/index.mjs
 * (causes: Module not found: Can't resolve '@reactflow/core')
 */
const fs = require("fs");
const path = require("path");

const coreEsm = path.join(
  __dirname,
  "..",
  "node_modules",
  "@reactflow",
  "core",
  "dist",
  "esm"
);

const mjs = path.join(coreEsm, "index.mjs");
const js = path.join(coreEsm, "index.js");

if (!fs.existsSync(mjs) && fs.existsSync(js)) {
  fs.copyFileSync(js, mjs);
  console.log("verify-reactflow: restored @reactflow/core/dist/esm/index.mjs");
}