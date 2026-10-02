import { rm } from "node:fs/promises";
import { join } from "node:path";

import { packageNames, root, run } from "./packages";

// Packages are listed in dependency order; consumers need their dependencies' dist first.
for (const name of packageNames) {
  if (name === "tsconfig") {
    continue;
  }

  const cwd = join(root, "packages", name);

  await rm(join(cwd, "dist"), { recursive: true, force: true });
  await run(["bun", "run", "build"], cwd);
}
