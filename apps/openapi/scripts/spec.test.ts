import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readSpec } from "./spec";

const directory = await mkdtemp(join(tmpdir(), "pgko-openapi-"));
const fixtures: string[] = [];

async function fixture(document: unknown): Promise<string> {
  const path = join(directory, `${fixtures.length}.json`);
  fixtures.push(path);
  await Bun.write(path, JSON.stringify(document));
  return path;
}

afterAll(async () => {
  await Promise.all(fixtures.map((path) => unlink(path)));
  await rmdir(directory);
});

const document = {
  openapi: "3.1.2",
  info: { title: "Example", version: "1.0.0" },
  paths: {},
  components: {
    schemas: {
      OptionalName: {
        type: "object",
        required: [],
        properties: { name: { type: ["string", "null"] } },
      },
      Profile: { $ref: "#/components/schemas/OptionalName" },
    },
  },
};

test("validates 3.1 schemas without rewriting references or source", async () => {
  const path = await fixture(document);
  const original = await Bun.file(path).text();
  expect(await readSpec(path)).toBe(original);
  expect(await Bun.file(path).text()).toBe(original);
});

test("rejects an invalid OpenAPI document", async () => {
  const path = await fixture({ ...document, info: { title: "Missing version" } });
  // oxlint-disable-next-line typescript/await-thenable -- Bun async matchers return promises despite their void types.
  await expect(readSpec(path)).rejects.toThrow();
});

test("rejects unresolved local references", async () => {
  const path = await fixture({
    ...document,
    components: { schemas: { Profile: { $ref: "#/components/schemas/Missing" } } },
  });
  // oxlint-disable-next-line typescript/await-thenable -- Bun async matchers return promises despite their void types.
  await expect(readSpec(path)).rejects.toThrow();
});

test.each(["https://example.invalid/private.json", "../private.json"])(
  "rejects external reference %s before resolution",
  async (reference) => {
    const path = await fixture({
      ...document,
      components: { schemas: { Profile: { $ref: reference } } },
    });
    // oxlint-disable-next-line typescript/await-thenable -- Bun async matchers return promises despite their void types.
    await expect(readSpec(path)).rejects.toThrow("The spec must be self-contained");
  },
);
