# pgko worker

Cloudflare Worker that serves crawler previews for bundle and user pages.

## Quick start

Complete the [workspace setup](../../README.md#prerequisites), then run from the repository root:

```sh
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
bun run dev:worker
```

Set `API_ORIGIN` in `.dev.vars` to the API origin.

## Common commands

Run from the repository root:

| Command                           | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `bun run build:worker`            | Build without deploying                         |
| `bun run --cwd apps/worker test`  | Run Worker tests                                |
| `bun run --cwd apps/worker types` | Regenerate bindings after configuration changes |

See [Worker development](../../docs/development.md#worker) and [deployment](../../docs/deployment.md#worker).
