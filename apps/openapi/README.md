# pgko API reference

Public OpenAPI contract and reference site.

## Quick start

Complete the [workspace setup](../../README.md#prerequisites), then run from the repository root:

```sh
bun run dev:openapi
```

Open [the local reference](http://127.0.0.1:4173/).

## Common commands

Run from the repository root:

| Command                                                           | Purpose                                      |
| ----------------------------------------------------------------- | -------------------------------------------- |
| `bun run --cwd apps/openapi spec:import <generated-openapi.json>` | Validate and import an exported API contract |
| `bun run build:openapi`                                           | Build the reference site                     |
| `bun run --cwd apps/openapi test`                                 | Test contract validation                     |

See [contract updates](../../docs/development.md#api-reference) and [deployment](../../docs/deployment.md#api-reference).
