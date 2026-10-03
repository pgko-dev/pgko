/**
 * Script: find and optionally remove unused i18n keys.
 *
 * - Scans the repo for usages of `t("ui.foo.bar")`, `i18n.t("api.bar")`,
 *   `translator("vali.foo")`, and bare string literals like
 *   `"api.error.unknown"` used in helpers such as `status`, `userError`,
 *   and `serverError`.
 * - Compares against defined keys in @pgko.dev/i18n (en ui/api/validation).
 * - In check mode (default), prints unused keys per namespace.
 * - With --fix, removes unused keys from all locales and rewrites i18n files.
 *
 * Run from repo root:
 *   bun run i18n:unused --web apps/web --backend ../api
 *   bun run i18n:unused --web apps/web --backend ../api --fix
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import { api as enApi } from "../src/en/api";
import { ui as enUi } from "../src/en/ui";
import { vali as enVali } from "../src/en/vali";
import { api as jaApi } from "../src/ja/api";
import { ui as jaUi } from "../src/ja/ui";
import { vali as jaVali } from "../src/ja/vali";
import { api as koApi } from "../src/ko/api";
import { ui as koUi } from "../src/ko/ui";
import { vali as koVali } from "../src/ko/vali";
import { api as hansApi } from "../src/zh-hans/api";
import { ui as hansUi } from "../src/zh-hans/ui";
import { vali as hansVali } from "../src/zh-hans/vali";
import { api as hantApi } from "../src/zh-hant/api";
import { ui as hantUi } from "../src/zh-hant/ui";
import { vali as hantVali } from "../src/zh-hant/vali";

const I18N_ROOT = path.join(import.meta.dir, "..");
const REPO_ROOT = path.join(I18N_ROOT, "..", "..");

type Namespace = "ui" | "api" | "vali";
type Locale = "en" | "ja" | "ko" | "zh-hans" | "zh-hant";

type TranslationTree = Record<string, unknown>;

type DefinedKeyInfo = {
  namespace: Namespace;
  fullKey: string;
};

type LocaleData = Record<Locale, Record<Namespace, TranslationTree>>;
type NamespaceKeySets = Record<Namespace, Set<string>>;
type UnusedKeys = Record<Namespace, DefinedKeyInfo[]>;
type RemovalCounts = Record<Locale, Record<Namespace, number>>;

const NAMESPACES: Namespace[] = ["ui", "api", "vali"];
const LOCALES: Locale[] = ["en", "ja", "ko", "zh-hans", "zh-hant"];

const USAGE_REGEX = /\b(?:t|i18n\.t|translator)\(\s*["'`](ui|api|vali)\.([^"'`]+?)["'`]/g;
const STRING_LITERAL_KEY_REGEX = /["'`](ui|api|vali)\.([^"'`]+?)["'`]/g;

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectObjectKeys(tree: TranslationTree, prefix: string[] = []): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(tree)) {
    const nextPrefix = [...prefix, key];

    if (isPlainObject(value)) {
      keys.push(...collectObjectKeys(value as TranslationTree, nextPrefix));
    } else {
      keys.push(nextPrefix.join("."));
    }
  }

  return keys;
}

function removeDottedKey(tree: TranslationTree, dottedKey: string): boolean {
  const segments = dottedKey.split(".");
  if (segments.length === 0) return false;

  const last = segments.at(-1);
  if (!last) return false;
  let current: TranslationTree | undefined = tree;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (!segment) {
      return false;
    }
    const next = current[segment];
    if (!isPlainObject(next)) {
      return false;
    }
    current = next as TranslationTree;
  }

  if (!current) return false;

  const currentAny = current as Record<string, unknown>;
  if (last in currentAny) {
    delete currentAny[last];
    return true;
  }

  return false;
}

async function* walkDir(root: string): AsyncGenerator<string> {
  const entries = await fs.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === ".turbo" ||
        entry.name === ".git" ||
        entry.name === ".cache" ||
        entry.name === "artifacts" ||
        entry.name === "vendor" ||
        entry.name === "data" ||
        (root === path.join(REPO_ROOT, "packages") && entry.name === "i18n")
      ) {
        continue;
      }
      yield* walkDir(fullPath);
    } else if (entry.isFile()) {
      if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
        yield fullPath;
      }
    }
  }
}

export async function collectUsedKeys(targets: string[]): Promise<Set<string>> {
  const used = new Set<string>();

  await Promise.all(
    targets.map(async (root) => {
      // Stream one file per consumer to cap open files while scanning roots concurrently.
      for await (const filePath of walkDir(root)) {
        const content = await fs.readFile(filePath, "utf8");

        for (const pattern of [USAGE_REGEX, STRING_LITERAL_KEY_REGEX]) {
          for (const match of content.matchAll(pattern)) {
            const ns = match[1] as Namespace;
            const rest = (match[2] ?? "").trim();

            if (rest) {
              used.add(`${ns}.${rest}`);
            }
          }
        }
      }
    }),
  );

  return used;
}

function buildDefinedKeys(): {
  definedKeysByNamespace: Record<Namespace, Set<string>>;
  definedKeyInfos: DefinedKeyInfo[];
  aliasByBaseKey: Record<string, string[]>;
} {
  const definedKeysByNamespace: Record<Namespace, Set<string>> = {
    ui: new Set<string>(),
    api: new Set<string>(),
    vali: new Set<string>(),
  };

  const definedKeyInfos: DefinedKeyInfo[] = [];
  const aliasByBaseKey: Record<string, string[]> = {};

  const enByNamespace: Record<Namespace, TranslationTree> = {
    ui: enUi as TranslationTree,
    api: enApi as TranslationTree,
    vali: enVali as TranslationTree,
  };

  for (const ns of NAMESPACES) {
    const tree = enByNamespace[ns];
    const dottedKeys = collectObjectKeys(tree);

    for (const key of dottedKeys) {
      const fullKey = `${ns}.${key}`;
      definedKeysByNamespace[ns].add(fullKey);
      definedKeyInfos.push({ namespace: ns, fullKey });

      const segments = key.split(".");
      const lastSegment = segments.at(-1);
      if (!lastSegment) continue;

      let baseLastSegment: string | undefined;
      if (lastSegment.endsWith("_one")) {
        baseLastSegment = lastSegment.slice(0, -"_one".length);
      } else if (lastSegment.endsWith("_other")) {
        baseLastSegment = lastSegment.slice(0, -"_other".length);
      }

      if (baseLastSegment) {
        const baseSegments = [...segments.slice(0, -1), baseLastSegment];
        const baseKey = `${ns}.${baseSegments.join(".")}`;

        const existing = aliasByBaseKey[baseKey] ?? [];
        existing.push(fullKey);
        aliasByBaseKey[baseKey] = existing;
      }
    }
  }

  return { definedKeysByNamespace, definedKeyInfos, aliasByBaseKey };
}

function buildLocaleData(): LocaleData {
  return {
    en: {
      ui: deepClone(enUi as TranslationTree),
      api: deepClone(enApi as TranslationTree),
      vali: deepClone(enVali as TranslationTree),
    },
    ja: {
      ui: deepClone(jaUi as TranslationTree),
      api: deepClone(jaApi as TranslationTree),
      vali: deepClone(jaVali as TranslationTree),
    },
    ko: {
      ui: deepClone(koUi as TranslationTree),
      api: deepClone(koApi as TranslationTree),
      vali: deepClone(koVali as TranslationTree),
    },
    "zh-hans": {
      ui: deepClone(hansUi as TranslationTree),
      api: deepClone(hansApi as TranslationTree),
      vali: deepClone(hansVali as TranslationTree),
    },
    "zh-hant": {
      ui: deepClone(hantUi as TranslationTree),
      api: deepClone(hantApi as TranslationTree),
      vali: deepClone(hantVali as TranslationTree),
    },
  };
}

function serializeObjectLiteral(tree: TranslationTree, indent = 2): string {
  // JSON.stringify output is valid as a TypeScript object literal.
  return JSON.stringify(tree, null, indent);
}

export function serializeLocaleFile(locale: Locale, namespace: Namespace, tree: TranslationTree) {
  const translationTypes: Record<Namespace, string> = {
    ui: "UiTranslation",
    api: "ApiTranslation",
    vali: "ValiTranslation",
  };
  const translationType = translationTypes[namespace];
  const header =
    locale === "en"
      ? 'import type { Widen } from "../utils";\n\n'
      : `import type { ${translationType} } from "../en/${namespace}";\n\n`;
  const footer =
    locale === "en"
      ? ` as const;\n\nexport type ${translationType} = Widen<typeof ${namespace}>;\n`
      : ` satisfies ${translationType};\n`;

  return `${header}export const ${namespace} = ${serializeObjectLiteral(tree)}${footer}\n`;
}

async function writeLocaleFiles(
  localeData: LocaleData,
  removedCounts: RemovalCounts,
): Promise<void> {
  const writes = LOCALES.flatMap((locale) =>
    NAMESPACES.filter((namespace) => removedCounts[locale][namespace] > 0).map((namespace) => {
      const filePath = path.join(I18N_ROOT, "src", locale, `${namespace}.ts`);
      const content = serializeLocaleFile(locale, namespace, localeData[locale][namespace]);

      return fs.writeFile(filePath, content, "utf8");
    }),
  );

  await Promise.all(writes);
}

function parseOptions(args: string[]) {
  const shouldFix = args.includes("--fix");
  const consumers: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];

    if (flag === "--fix") {
      continue;
    }

    if (
      (flag !== "--web" && flag !== "--backend") ||
      !args[i + 1] ||
      args[i + 1].startsWith("--")
    ) {
      throw new Error(
        "Usage: bun run i18n:unused --web <web checkout> --backend <backend checkout> [--fix]",
      );
    }
    consumers[flag] = path.resolve(args[++i]);
  }

  if (!consumers["--web"] || !consumers["--backend"]) {
    throw new Error(
      "Both --web and --backend checkouts are required; shared-only scans cannot identify unused keys safely.",
    );
  }
  return { shouldFix, consumers };
}

async function consumerTargets(consumers: Record<string, string>) {
  const webSource = path.join(consumers["--web"], "src");
  const backendSource = path.join(consumers["--backend"], "apps", "api", "src");
  const requiredSources = [path.join(webSource, "routes"), path.join(backendSource, "modules")];

  await Promise.all(
    requiredSources.map(async (dir) => {
      if (!(await fs.stat(dir)).isDirectory()) {
        throw new Error(`Missing consumer source: ${dir}`);
      }
    }),
  );

  return [webSource, backendSource, path.join(REPO_ROOT, "packages")];
}

function addUsedKey(
  usedKey: string,
  definedKeysByNamespace: NamespaceKeySets,
  aliasByBaseKey: Record<string, string[]>,
  usedDefinedKeysByNamespace: NamespaceKeySets,
) {
  const [namespace] = usedKey.split(".");

  if (namespace !== "ui" && namespace !== "api" && namespace !== "vali") {
    return;
  }

  const definedSet = definedKeysByNamespace[namespace];
  const usedSet = usedDefinedKeysByNamespace[namespace];

  if (definedSet.has(usedKey)) {
    usedSet.add(usedKey);
    return;
  }

  const aliasTargets = aliasByBaseKey[usedKey];

  if (aliasTargets && aliasTargets.length > 0) {
    for (const target of aliasTargets) {
      usedSet.add(target);
    }

    return;
  }

  const dynamicIndex = usedKey.indexOf(".${");

  if (dynamicIndex === -1) {
    return;
  }

  const dynamicPrefix = usedKey.slice(0, dynamicIndex);

  for (const definedKey of definedSet) {
    if (definedKey.startsWith(dynamicPrefix)) {
      usedSet.add(definedKey);
    }
  }
}

export function findUnusedKeys(
  definedKeysByNamespace: NamespaceKeySets,
  aliasByBaseKey: Record<string, string[]>,
  usedKeys: Set<string>,
): UnusedKeys {
  const unusedByNamespace: UnusedKeys = { ui: [], api: [], vali: [] };

  const usedDefinedKeysByNamespace: NamespaceKeySets = {
    ui: new Set<string>(),
    api: new Set<string>(),
    vali: new Set<string>(),
  };

  for (const usedKey of usedKeys) {
    addUsedKey(usedKey, definedKeysByNamespace, aliasByBaseKey, usedDefinedKeysByNamespace);
  }

  for (const ns of NAMESPACES) {
    for (const fullKey of definedKeysByNamespace[ns]) {
      if (!usedDefinedKeysByNamespace[ns].has(fullKey)) {
        unusedByNamespace[ns].push({ namespace: ns, fullKey });
      }
    }
  }

  return unusedByNamespace;
}

function printSummary(definedKeysByNamespace: NamespaceKeySets, unusedByNamespace: UnusedKeys) {
  let totalDefined = 0;
  let totalUsed = 0;
  let totalUnused = 0;

  for (const ns of NAMESPACES) {
    const definedCount = definedKeysByNamespace[ns].size;
    const unusedCount = unusedByNamespace[ns].length;
    const usedCount = definedCount - unusedCount;

    totalDefined += definedCount;
    totalUsed += usedCount;
    totalUnused += unusedCount;

    console.log(`${ns}: defined=${definedCount}, used=${usedCount}, unused=${unusedCount}`);
  }

  console.log(`Total: defined=${totalDefined}, used=${totalUsed}, unused=${totalUnused}`);

  return totalUnused;
}

function removeUnusedKeys(localeData: LocaleData, unusedByNamespace: UnusedKeys): RemovalCounts {
  const removedByLocaleAndNamespace: RemovalCounts = {
    en: { ui: 0, api: 0, vali: 0 },
    ja: { ui: 0, api: 0, vali: 0 },
    ko: { ui: 0, api: 0, vali: 0 },
    "zh-hans": { ui: 0, api: 0, vali: 0 },
    "zh-hant": { ui: 0, api: 0, vali: 0 },
  };

  for (const ns of NAMESPACES) {
    const unused = unusedByNamespace[ns];

    for (const { fullKey } of unused) {
      const segments = fullKey.split(".");
      const withoutNamespace = segments.slice(1).join(".");

      for (const locale of LOCALES) {
        const tree = localeData[locale][ns];
        if (removeDottedKey(tree, withoutNamespace)) {
          removedByLocaleAndNamespace[locale][ns] += 1;
        }
      }
    }
  }

  return removedByLocaleAndNamespace;
}

function printRemovals(removedByLocaleAndNamespace: RemovalCounts) {
  console.log("\nRemoved keys per file:");
  for (const locale of LOCALES) {
    for (const ns of NAMESPACES) {
      const count = removedByLocaleAndNamespace[locale][ns];
      if (count > 0) {
        console.log(`  ${locale}/${ns}.ts: removed ${count} key${count === 1 ? "" : "s"}`);
      }
    }
  }
}

function printUnusedKeys(unusedByNamespace: UnusedKeys) {
  console.log("\nUnused keys:");

  for (const ns of NAMESPACES) {
    const unused = unusedByNamespace[ns];

    if (unused.length > 0) {
      console.log(`\n[${ns}]`);

      for (const { fullKey } of unused) {
        console.log(`  - ${fullKey}`);
      }
    }
  }
}

async function main() {
  const { shouldFix, consumers } = parseOptions(process.argv.slice(2));
  const targets = await consumerTargets(consumers);

  console.log("Scanning for unused i18n keys...");

  const { definedKeysByNamespace, aliasByBaseKey } = buildDefinedKeys();
  const usedKeys = await collectUsedKeys(targets);
  const unusedByNamespace = findUnusedKeys(definedKeysByNamespace, aliasByBaseKey, usedKeys);
  const totalUnused = printSummary(definedKeysByNamespace, unusedByNamespace);

  if (totalUnused === 0) {
    console.log("No unused i18n keys detected.");
    return;
  }

  printUnusedKeys(unusedByNamespace);

  // Non-zero exit lets CI flag unused keys in both check and fix modes.
  process.exitCode = 1;

  if (!shouldFix) {
    console.log("\nRun with --fix to remove these keys from all locales.");
    return;
  }

  console.log("\n--fix specified, removing unused keys from locale files...");

  const localeData = buildLocaleData();
  const removedCounts = removeUnusedKeys(localeData, unusedByNamespace);

  await writeLocaleFiles(localeData, removedCounts);
  printRemovals(removedCounts);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
