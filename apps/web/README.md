# pgko web

React frontend for [pgko](https://pgko.dev/).

## Quick start

Complete the [workspace setup](../../README.md#prerequisites), then run from the repository root:

```sh
cp apps/web/.env.development.example apps/web/.env.development.local
bun run dev:web
```

Open [localhost:3001](http://localhost:3001). Leave `PUBLIC_API_URL` empty to use the local API on port 3000, or set it to another API origin. All `PUBLIC_*` values are visible in the browser.

## Common commands

Run from the repository root:

| Command                               | Purpose                                |
| ------------------------------------- | -------------------------------------- |
| `bun run build:web`                   | Build the frontend and shared packages |
| `bun run --cwd apps/web test`         | Run unit tests                         |
| `bun run --cwd apps/web test:browser` | Run Playwright tests                   |
| `bun run --cwd apps/web bench:ugc`    | Run chart renderer benchmarks          |
| `bun run --cwd apps/web dev:preview`  | Start the chart preview lab            |

See [development and browser tests](../../docs/development.md#web), [the preview lab](e2e/README.md), [renderer benchmarks](bench/ugc-render/README.md), and [deployment](../../docs/deployment.md#web).
