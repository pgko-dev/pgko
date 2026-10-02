import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { collectUsedKeys, findUnusedKeys, serializeLocaleFile } from "./find-unused-i18n";

const script = fileURLToPath(new URL("./find-unused-i18n.ts", import.meta.url));

test("destructive cleanup requires both consumer checkouts", async () => {
  const proc = Bun.spawn([process.execPath, script, "--fix"], { stdout: "pipe", stderr: "pipe" });
  expect(await proc.exited).not.toBe(0);
  expect(await new Response(proc.stderr).text()).toContain("Both --web and --backend");
});

test("missing consumer source fails instead of being treated as unused", async () => {
  const proc = Bun.spawn(
    [process.execPath, script, "--web", import.meta.dir, "--backend", import.meta.dir, "--fix"],
    { stdout: "pipe", stderr: "pipe" },
  );
  expect(await proc.exited).not.toBe(0);
  expect(await new Response(proc.stderr).text()).toContain("ENOENT");
});

test("scanning combines consumer roots and skips generated and non-TypeScript files", async () => {
  const temp = await mkdtemp(join(tmpdir(), "pgko-i18n-scan-"));

  try {
    const web = join(temp, "web");
    const backend = join(temp, "backend");
    const excluded = join(web, "node_modules");

    await Promise.all([mkdir(excluded, { recursive: true }), mkdir(backend)]);
    await Promise.all([
      writeFile(join(web, "page.tsx"), 't("ui.page.title"); const key = "api.error.unknown";'),
      writeFile(join(backend, "errors.ts"), 'translator("vali.email");'),
      writeFile(join(excluded, "unused.ts"), 't("ui.excluded");'),
      writeFile(join(web, "ignored.js"), 't("ui.javascript");'),
    ]);

    const used = await collectUsedKeys([web, backend]);

    expect([...used].sort()).toEqual(["api.error.unknown", "ui.page.title", "vali.email"]);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("unused detection preserves exact keys, plural aliases and dynamic prefixes", () => {
  const defined = {
    ui: new Set(["ui.title", "ui.count_one", "ui.count_other", "ui.status.ready", "ui.unused"]),
    api: new Set(["api.error.missing", "api.error.invalid"]),
    vali: new Set(["vali.required"]),
  };
  const aliases = { "ui.count": ["ui.count_one", "ui.count_other"] };
  const used = new Set(["ui.title", "ui.count", "api.error.${code}", "unknown.key"]);

  expect(findUnusedKeys(defined, aliases, used)).toEqual({
    ui: [
      { namespace: "ui", fullKey: "ui.status.ready" },
      { namespace: "ui", fullKey: "ui.unused" },
    ],
    api: [],
    vali: [{ namespace: "vali", fullKey: "vali.required" }],
  });
});

test("locale serialization preserves English type exports and translated type constraints", () => {
  expect(serializeLocaleFile("en", "api", { error: "Missing" })).toBe(
    'import type { Widen } from "../utils";\n\n' +
      'export const api = {\n  "error": "Missing"\n} as const;\n\n' +
      "export type ApiTranslation = Widen<typeof api>;\n\n",
  );
  expect(serializeLocaleFile("ja", "vali", { required: "必須" })).toBe(
    'import type { ValiTranslation } from "../en/vali";\n\n' +
      'export const vali = {\n  "required": "必須"\n} satisfies ValiTranslation;\n\n',
  );
});
