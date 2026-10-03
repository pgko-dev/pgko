# @pgko.dev/ugc-render

UMIGURI chart parsing, layout, Canvas rendering, and browser playback. Framework independent, with no runtime dependencies.

## Usage

```sh
bun add @pgko.dev/ugc-render
```

```ts
import { prepareChart } from "@pgko.dev/ugc-render";

const response = await fetch("/chart.ugc");
const chartBytes = new Uint8Array(await response.arrayBuffer());
const prepared = prepareChart(chartBytes);
if (prepared.chart) {
  console.log(prepared.layout, prepared.hits);
} else {
  console.error(prepared.diagnostics);
}
```

| Entry point                     | Purpose                                  |
| ------------------------------- | ---------------------------------------- |
| `@pgko.dev/ugc-render`          | Parsing, preparation, layout, and timing |
| `@pgko.dev/ugc-render/canvas`   | Canvas painting                          |
| `@pgko.dev/ugc-render/playback` | Browser audio transport                  |
| `@pgko.dev/ugc-render/worker`   | Cancellable chart preparation            |

See [integration notes](https://github.com/pgko-dev/pgko/blob/main/docs/packages.md#ugc-render) and [browser testing](https://github.com/pgko-dev/pgko/blob/main/docs/development.md#browser-tests).

Based on [MargreteOnline by inonote](https://github.com/inonote/MargreteOnline). [MIT license](LICENSE); see [third-party notices](THIRD_PARTY_NOTICES.md).
