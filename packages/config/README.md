# @pgko.dev/config

Shared site settings, header and cookie names, and validation limits.

## Usage

```sh
bun add @pgko.dev/config
```

```ts
import { Common, SITE_NAME } from "@pgko.dev/config";

const csrfHeader = Common.CsrfToken;
const siteName = SITE_NAME;
```

See [package notes](https://github.com/pgko-dev/pgko/blob/main/docs/packages.md#config) and [workspace development](https://github.com/pgko-dev/pgko/blob/main/docs/development.md).

[MIT license](LICENSE).
