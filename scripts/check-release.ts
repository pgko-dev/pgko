import assert from "node:assert/strict";
import { join } from "node:path";

import { dependencyGroups, packageNames, root } from "./packages";

type WorkspaceLock = {
  version: string;
  [key: string]: unknown;
};

type Lockfile = {
  catalog: Record<string, string>;
  workspaces: Record<string, WorkspaceLock>;
};

const releasePackage = await Bun.file(join(root, "packages/config/package.json")).json();
const version = releasePackage.version;
const lockfileContents = await Bun.file(join(root, "bun.lock")).text();
const lock = Bun.JSONC.parse(lockfileContents) as Lockfile;

const manifest = await Bun.file(join(root, "package.json")).json();

assert.deepEqual(lock.catalog, manifest.catalog, "Stale catalog in bun.lock");

const packageManifests = await Promise.all(
  packageNames.map(async (name) => ({
    name,
    pkg: await Bun.file(join(root, "packages", name, "package.json")).json(),
  })),
);

for (const { name, pkg } of packageManifests) {
  assert.equal(pkg.version, version, `${pkg.name} must release at ${version}`);

  const locked = lock.workspaces[`packages/${name}`];

  assert.equal(locked.version, version, `${pkg.name}: stale lockfile version`);

  for (const group of dependencyGroups) {
    assert.deepEqual(
      locked[group] ?? {},
      pkg[group] ?? {},
      `${pkg.name}: stale ${group} in bun.lock`,
    );
  }
}
