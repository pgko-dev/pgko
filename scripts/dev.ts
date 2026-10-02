import { join } from "node:path";

import { packageNames, root, run } from "./packages";

const app = process.argv[2] ?? "web";

if (app !== "web" && app !== "worker") {
  throw new Error("Usage: bun scripts/dev.ts <web|worker>");
}

await run(["bun", "run", "build:packages"]);

const children: Bun.Subprocess[] = [];
let stopping = false;

function stop() {
  if (stopping) {
    return;
  }

  stopping = true;

  for (const child of children) {
    child.kill();
  }
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

try {
  for (const name of packageNames) {
    if (name === "tsconfig") {
      continue;
    }

    children.push(
      Bun.spawn(
        [
          process.execPath,
          join(root, "node_modules/typescript/bin/tsc"),
          "-p",
          "tsconfig.build.json",
          "--watch",
        ],
        {
          cwd: join(root, "packages", name),
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        },
      ),
    );
  }

  children.push(
    Bun.spawn(["bun", "run", "dev", ...process.argv.slice(3)], {
      cwd: join(root, "apps", app),
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }),
  );

  const exitCode = await Promise.race(children.map((child) => child.exited));

  if (!stopping && exitCode !== 0) {
    process.exitCode = exitCode;
  }
} finally {
  stop();
}
