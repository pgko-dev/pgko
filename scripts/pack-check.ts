import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { dependencyGroups, packageNames, root, run } from "./packages";

type RuntimeExport = {
  types: string;
  import: string;
};

const localDependencyPattern = /(?:workspace:|catalog:|file:|link:|@repo\/)/;

const allowedPackageFiles = new Set([
  "package.json",
  "README.md",
  "LICENSE",
  "dist",
  "base.json",
  "build.json",
  "react-library.json",
]);

const consumerEnvironments = [
  { lib: ["ESNext", "DOM"], types: [] },
  { lib: ["ESNext"], types: ["bun"] },
];

// Inspect and exercise the actual artifacts consumers receive, outside the workspace.
const workspaceManifest = await Bun.file(join(root, "package.json")).json();
const catalog = workspaceManifest.catalog;
const artifacts = join(root, "artifacts");

await mkdir(artifacts, { recursive: true });

const temp = await mkdtemp(join(tmpdir(), "pgko-pack-check-"));
const dependencies: Record<string, string> = {};
const imports: string[] = [];
const types: string[] = [];
let version: string | undefined;

try {
  for (const name of packageNames) {
    const source = join(root, "packages", name);
    const sourcePkg = await Bun.file(join(source, "package.json")).json();

    version ??= sourcePkg.version;
    assert.equal(sourcePkg.version, version, "Packages must have one release version");

    await run(["bun", "pm", "pack", "--destination", artifacts], source);

    const tarball = resolve(artifacts, `pgko-dev-${name}-${version}.tgz`);
    const unpacked = join(temp, name);

    await mkdir(unpacked);
    await run(["tar", "-xzf", tarball, "-C", unpacked]);

    const pkgDir = join(unpacked, "package");
    const raw = await readFile(join(pkgDir, "package.json"), "utf8");

    assert(!localDependencyPattern.test(raw), "Unresolved local dependency");

    const pkg = JSON.parse(raw);

    for (const group of dependencyGroups) {
      for (const [dependency, requested] of Object.entries(pkg[group] ?? {})) {
        if (dependency.startsWith("@pgko-dev/")) {
          assert.equal(requested, version, `${pkg.name}: ${dependency} must use ${version}`);
        }
      }
    }

    assert.equal(pkg.private, undefined);
    assert.equal(pkg.publishConfig.access, "public");

    if (name === "tsconfig") {
      for (const value of Object.values(pkg.exports) as string[]) {
        await readFile(join(pkgDir, value));
      }
    }

    for (const entry of await readdir(pkgDir)) {
      assert(allowedPackageFiles.has(entry), `Unexpected packed file: ${entry}`);
    }

    const runtimeExports: Record<string, RuntimeExport> = name === "tsconfig" ? {} : pkg.exports;

    for (const [key, value] of Object.entries(runtimeExports)) {
      const specifier = pkg.name + (key === "." ? "" : key.slice(1));

      assert(!specifier.endsWith("/server"));
      await readFile(join(pkgDir, value.import));
      await readFile(join(pkgDir, value.types));

      imports.push(`await import(${JSON.stringify(specifier)});`);
      types.push(`import ${JSON.stringify(specifier)};`);
    }

    dependencies[pkg.name] = tarball;
  }

  const consumer = join(temp, "consumer");
  const consumerManifest = {
    private: true,
    type: "module",
    dependencies,
    overrides: dependencies,
    devDependencies: {
      typescript: catalog.typescript,
      "@types/bun": catalog["@types/bun"],
    },
  };

  await mkdir(consumer);
  await Bun.write(join(consumer, "package.json"), JSON.stringify(consumerManifest, null, 2));
  await run(["bun", "install", "--ignore-scripts"], consumer);

  await Bun.write(
    join(consumer, "smoke.mjs"),
    imports.join("\n") + '\nconsole.log("All package exports loaded.");\n',
  );

  await run(["node", "smoke.mjs"], consumer);
  await run(["bun", "smoke.mjs"], consumer);
  await Bun.write(join(consumer, "smoke.ts"), types.join("\n"));

  for (const environment of consumerEnvironments) {
    const compilerConfig = {
      extends: "@pgko-dev/tsconfig/base.json",
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        skipLibCheck: false,
        ...environment,
      },
      include: ["smoke.ts"],
    };

    await Bun.write(join(consumer, "tsconfig.json"), JSON.stringify(compilerConfig, null, 2));
    await run(["bun", "x", "--no-install", "tsc", "--noEmit"], consumer);
  }

  console.log(`Validated ${packageNames.length} package tarballs at ${version}.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
