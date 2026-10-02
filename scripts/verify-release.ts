import { join } from "node:path";

import { packageNames, root } from "./packages";

type RegistryMetadata = {
  versions?: Record<string, unknown>;
};

const registryWaitTimeoutMs = 10 * 60_000;
const registryRequestTimeoutMs = 30_000;
const registryRetryIntervalMs = 30_000;

const manifest = await Bun.file(join(root, "packages/config/package.json")).json();
const version = manifest.version;
const deadline = Date.now() + registryWaitTimeoutMs;
let pending = [...packageNames];

async function isAvailable(name: string): Promise<boolean> {
  const response = await fetch(`https://registry.npmjs.org/@pgko-dev%2f${name}`, {
    headers: { accept: "application/vnd.npm.install-v1+json" },
    signal: AbortSignal.timeout(registryRequestTimeoutMs),
  });

  const retryableStatus =
    response.status === 404 || response.status === 429 || response.status >= 500;

  if (retryableStatus) {
    return false;
  }

  if (!response.ok) {
    throw new Error(`Registry returned ${response.status} for ${name}`);
  }

  const metadata = (await response.json()) as RegistryMetadata;

  return Boolean(metadata.versions?.[version]);
}

while (pending.length && Date.now() < deadline) {
  const availability = await Promise.all(pending.map((name) => isAvailable(name)));

  pending = pending.filter((_, index) => !availability[index]);

  if (pending.length) {
    console.log(`Waiting for npm to make ${version} installable: ${pending.join(", ")}`);
    await Bun.sleep(registryRetryIntervalMs);
  }
}

if (pending.length) {
  const missingPackages = pending.join(", ");

  throw new Error(
    `npm has accepted the release but these packages are not installable yet: ${missingPackages}. ` +
      "Check registry availability before retrying publication.",
  );
}

console.log(`All ${packageNames.length} packages at ${version} are available from npm.`);
