# Shared packages

Public package READMEs contain installation and minimal usage examples. This guide covers exports and maintenance. For local development, install at the root and run `bun run build:packages` before using package exports.

Runtime packages publish ESM and TypeScript declarations from `dist/`. `@pgko.dev/tsconfig` publishes JSON configurations. Packages share a release version; see [releases](releases.md).

| Package                                        | Purpose                                         |
| ---------------------------------------------- | ----------------------------------------------- |
| [common](../packages/common/README.md)         | Bundle, song, filename, and tag helpers         |
| [config](../packages/config/README.md)         | Site constants and validation limits            |
| [env](../packages/env/README.md)               | Environment parsing                             |
| [i18n](../packages/i18n/README.md)             | Translations and language metadata              |
| [schema](../packages/schema/README.md)         | Validation schemas and API models               |
| [tsconfig](../packages/tsconfig/README.md)     | Shared compiler configurations                  |
| [ugc](../packages/ugc/README.md)               | Streaming beatmap header parser                 |
| [ugc-render](../packages/ugc-render/README.md) | Full chart preparation, rendering, and playback |

## common

The root exports bundle, song, and tag helpers. `@pgko.dev/common/songs` exposes song helpers separately.

`sortSongs` returns a new array. `sanitizeTags` normalizes whitespace and case, removes duplicates, validates tags, and applies the limits from `@pgko.dev/config`. `toSafeDownloadFilename` strips invalid filename characters and uses the caller's fallback when the result is empty.

## config

The root exports `SITE_NAME`, `Common`, `BundleRules`, and `UserRules`. These values keep frontend and API validation limits and header/cookie names aligned. Change shared limits here rather than duplicating them in consumers.

## env

There is no root import.

| Entry point            | Exports                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `@pgko.dev/env/common` | `envString`, required/optional string helpers, and `integerFromString` |
| `@pgko.dev/env/client` | `ClientEnvironmentSchema` and its output type                          |

`envString` trims strings and converts empty strings or null values to `undefined` before applying the supplied Valibot schema. The client schema accepts the optional `PUBLIC_*` settings used by the frontend. Consumers explicitly validate their environment with Valibot.

## i18n

The root exports language metadata, resource types, and utilities. `/all` exports `languageResources` for i18next. Individual locale entry points export `api`, `ui`, and `vali` resources.

Locale import paths use `zh-hans` and `zh-hant`; runtime language codes use `zh-Hans` and `zh-Hant`. English is the default language and `translation` is the default namespace.

Maintain translation keys across all supported locales. Check frontend usage with:

```sh
bun run i18n:unused
```

Review reported keys before removing them; consumers outside the frontend may also use a translation.

## schema

The root exports shared primitives, user and bundle validation, and public API models. These define application contracts.

Default schemas use `dTranslator` to encode validation translation keys. For localized messages, pass an initialized i18next translator to the corresponding `t*Schema` factory, such as `tEmailSchema`. Consumers must provide the i18next peer dependency.

Run schema tests from the repository root:

```sh
bun run --cwd packages/schema test
```

## tsconfig

| Configuration        | Purpose                                                         |
| -------------------- | --------------------------------------------------------------- |
| `base.json`          | Strict checking with bundler resolution and no emitted output   |
| `react-library.json` | Base settings with JSX and DOM libraries                        |
| `build.json`         | NodeNext output and declaration generation for runtime packages |

`build.json` is an override layer. Package build configs extend their local checking config and this layer, then set their own input and output directories.

## ugc

`parseUgc` accepts a `ReadableStream<Uint8Array<ArrayBuffer>>` and returns validated header metadata plus an encoding flag. It reads through `@ENDHEAD` and cancels the stream; it does not return chart notes.

Headers are limited to 1 MiB and decoded as UTF-8. Invalid headers throw `UgcError` with validation issues. `encoding.hasReplacementChars` reports replacement characters in selected metadata fields.

Use `@pgko.dev/ugc-render` when a consumer needs full chart parsing or preview playback.

## ugc-render

| Entry point                     | Main API                                                           |
| ------------------------------- | ------------------------------------------------------------------ |
| `@pgko.dev/ugc-render`          | `parseUgcChart`, `prepareChart`, layout, note indexing, and timing |
| `@pgko.dev/ugc-render/canvas`   | `ChartPainter` and theme helpers                                   |
| `@pgko.dev/ugc-render/playback` | `ChartTransport`                                                   |
| `@pgko.dev/ugc-render/worker`   | `prepareInWorker`                                                  |

`prepareChart` accepts beatmap bytes and returns diagnostics. A successful result includes the parsed chart, layout, and hit times; failure returns `chart: null`. Inspect the result before painting.

For interactive applications, use `prepareInWorker` with a dedicated worker whose message handler calls `prepareChart`. The adapter transfers the input buffer, so it detaches from the caller, and terminates its worker after completion or cancellation.

Canvas and playback integrations require browser APIs. `ChartTransport` combines streaming music with Web Audio hit sounds; the application supplies audio URLs, event callbacks, and controls. React integration belongs in `apps/web`.

See [browser testing and the preview lab](development.md#browser-tests) and [third-party notices](../packages/ugc-render/THIRD_PARTY_NOTICES.md).
