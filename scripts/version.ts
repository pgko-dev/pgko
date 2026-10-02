import { join } from "node:path";

import { packageNames, root, run } from "./packages";

const releaseVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const version = process.argv[2];

if (!version || !releaseVersionPattern.test(version)) {
  throw new Error("Usage: bun run version:packages <major.minor.patch[-prerelease]>");
}

const packageManifests = await Promise.all(
  packageNames.map(async (name) => {
    const path = join(root, "packages", name, "package.json");

    return { path, pkg: await Bun.file(path).json() };
  }),
);
const packageWrites: Promise<number>[] = [];

for (const { path, pkg } of packageManifests) {
  pkg.version = version;
  packageWrites.push(Bun.write(path, JSON.stringify(pkg, null, 2) + "\n"));
}

await Promise.all(packageWrites);

// Bun 1.4 needs a second resolution pass after workspace versions change.
await run(["bun", "install", "--lockfile-only", "--ignore-scripts"]);
await run(["bun", "install", "--ignore-scripts"]);
await run(["bun", "run", "deps:check"]);
await run(["bun", "scripts/check-release.ts"]);
await run(["bun", "run", "fmt:w"]);
