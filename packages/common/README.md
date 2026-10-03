# @pgko.dev/common

Shared helpers for bundle status, download filenames, song sorting, and tags.

## Usage

```sh
bun add @pgko.dev/common
```

```ts
import { toSafeDownloadFilename } from "@pgko.dev/common";

const filename = toSafeDownloadFilename("My chart", "bundle");
```

Song helpers are also available from `@pgko.dev/common/songs`.

See [package notes](https://github.com/pgko-dev/pgko/blob/main/docs/packages.md#common) and [workspace development](https://github.com/pgko-dev/pgko/blob/main/docs/development.md).

[MIT license](LICENSE).
