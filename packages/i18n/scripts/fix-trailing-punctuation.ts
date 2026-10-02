/**
 * Codemod: remove trailing Japanese full stop "。" before closing quotes
 * in ja and zh i18n files.
 *
 * Idempotent and safe to re-run. Only affects `ui.ts`, `api.ts`, and
 * `vali.ts` files for:
 * - ja
 * - ko
 * - zh-hans
 * - zh-hant
 *
 * Run from repo root:
 *   bun run --cwd packages/i18n scripts/fix-trailing-punctuation.ts
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const ROOT = path.join(import.meta.dir, "..");

const LOCALES = ["ja", "ko", "zh-hans", "zh-hant"] as const;
const FILE_BASENAMES = ["ui.ts", "api.ts", "vali.ts"] as const;

const TARGET_FILES = LOCALES.flatMap((locale) =>
  FILE_BASENAMES.map((basename) => path.join(ROOT, "src", locale, basename)),
);

type Result = {
  file: string;
  replaced: number;
};

async function processFile(filePath: string): Promise<Result> {
  const original = await fs.readFile(filePath, "utf8");

  let replacedTotal = 0;
  let updated = original;

  const patterns: RegExp[] = [/。\s*"/g, /。\s*'/g, /。\s*`/g];

  for (const pattern of patterns) {
    updated = updated.replace(pattern, (match) => {
      replacedTotal++;
      return match.trimEnd().slice(-1);
    });
  }

  if (replacedTotal > 0 && updated !== original) {
    await fs.writeFile(filePath, updated, "utf8");
  }

  return { file: filePath, replaced: replacedTotal };
}

async function main() {
  console.log('Running i18n trailing "。" codemod...');

  const results: Result[] = [];
  const outcomes = await Promise.allSettled(TARGET_FILES.map((file) => processFile(file)));

  for (const [index, outcome] of outcomes.entries()) {
    const file = TARGET_FILES[index];

    if (outcome.status === "fulfilled") {
      const res = outcome.value;
      results.push(res);
      console.log(
        `${path.relative(ROOT, file)}: removed ${res.replaced} trailing "。" occurrence${res.replaced === 1 ? "" : "s"}`,
      );
    } else {
      console.error(`Failed to process ${file}:`, outcome.reason);
    }
  }

  const total = results.reduce((sum, r) => sum + r.replaced, 0);
  console.log(
    `Done. Removed ${total} trailing "。" occurrence${total === 1 ? "" : "s"} across ${results.length} files.`,
  );
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
