import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { readSpec } from "./spec";

const root = resolve(import.meta.dir, "..");
const output = resolve(root, "dist");
await readSpec(resolve(root, "openapi.json"));
await mkdir(output, { recursive: true });

for (const filename of ["index.html", "openapi.json"]) {
  await copyFile(resolve(root, filename), resolve(output, filename));
}
await copyFile(
  resolve(root, "node_modules/@scalar/api-reference/dist/browser/standalone.js"),
  resolve(output, "scalar.js"),
);
await Bun.write(resolve(output, ".nojekyll"), "");
console.log(`Built API reference: ${output}`);
