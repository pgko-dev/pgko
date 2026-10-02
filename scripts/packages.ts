import { fileURLToPath } from "node:url";

export const packageNames = ["tsconfig", "config", "i18n", "env", "ugc", "schema", "common"];

export const dependencyGroups = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

export const root = fileURLToPath(new URL("../", import.meta.url));

export async function run(command: string[], cwd = root) {
  const process = Bun.spawn(command, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await process.exited;

  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed (${exitCode})`);
  }
}
