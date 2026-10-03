import { createHash } from "node:crypto";
import { join } from "node:path";

import { packageArchiveName, packageNames, root, run } from "./packages";

type PublishedPackage = {
  dist: {
    integrity: string;
  };
};

const manifest = await Bun.file(join(root, "packages/config/package.json")).json();
const version = manifest.version;
const initial = process.argv.includes("--initial");

if (initial && !process.env.CI) {
  await run(["npm", "whoami"]);
} else if (process.env.GITHUB_REF !== `refs/tags/v${version}`) {
  throw new Error(`Publish only from tag v${version}`);
}

// Publish in dependency order and stop at the first failed registry or integrity check.
for (const name of packageNames) {
  const pkg = await Bun.file(join(root, "packages", name, "package.json")).json();
  const tarball = join(root, "artifacts", packageArchiveName(pkg.name, version));

  // Query HTTP directly to distinguish an absent version from registry/auth outages.
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/${version}`,
  );

  if (response.ok) {
    const published = (await response.json()) as PublishedPackage;
    const tarballContents = new Uint8Array(await Bun.file(tarball).arrayBuffer());
    const digest = createHash("sha512").update(tarballContents).digest("base64");
    const integrity = `sha512-${digest}`;

    if (published.dist.integrity !== integrity) {
      throw new Error(
        `${pkg.name}@${version} already exists with different contents; bump the version.`,
      );
    }

    console.log(`${pkg.name}@${version} already published; skipping.`);
    continue;
  }

  if (response.status !== 404) {
    throw new Error(`Registry returned ${response.status}`);
  }

  await run([
    "npm",
    "publish",
    tarball,
    "--access",
    "public",
    "--tag",
    version.includes("-") ? "next" : "latest",
  ]);
}
