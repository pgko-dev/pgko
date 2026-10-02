import { resolve } from "node:path";

import { readSpec } from "./spec";

const [source, ...extra] = process.argv.slice(2);
if (!source || extra.length) {
  throw new Error("Usage: bun run spec:import <generated-openapi.json>");
}

const contents = await readSpec(resolve(source));
const destination = resolve(import.meta.dir, "../openapi.json");
await Bun.write(destination, contents);
console.log(`Imported validated contract: ${destination}`);
