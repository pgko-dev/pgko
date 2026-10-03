# @pgko.dev/ugc

Streaming UMIGURI beatmap header parser and metadata types.

## Usage

```sh
bun add @pgko.dev/ugc
```

```ts
import { parseUgc } from "@pgko.dev/ugc";

const response = await fetch("/chart.ugc");
const beatmapFile = await response.blob();
const { header } = await parseUgc(beatmapFile.stream());
```

Use [ugc-render](https://github.com/pgko-dev/pgko/tree/main/packages/ugc-render) for full chart parsing, rendering, and playback.

See [parser behavior](https://github.com/pgko-dev/pgko/blob/main/docs/packages.md#ugc) and [workspace development](https://github.com/pgko-dev/pgko/blob/main/docs/development.md).

[MIT license](LICENSE).
