# @pgko.dev/i18n

Translations, validation messages, and language metadata for English, Japanese, Korean, Simplified Chinese, and Traditional Chinese.

## Usage

```sh
bun add @pgko.dev/i18n i18next
```

```ts
import { defaultLanguage, defaultNamespace } from "@pgko.dev/i18n";
import { languageResources } from "@pgko.dev/i18n/all";
import i18next from "i18next";

await i18next.init({
  lng: defaultLanguage,
  defaultNS: defaultNamespace,
  resources: languageResources,
});
```

Individual resources are available from `/en`, `/ja`, `/ko`, `/zh-hans`, and `/zh-hant`.

See [translation maintenance](https://github.com/pgko-dev/pgko/blob/main/docs/packages.md#i18n) and [workspace development](https://github.com/pgko-dev/pgko/blob/main/docs/development.md).

[MIT license](LICENSE).
