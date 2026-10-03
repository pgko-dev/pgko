# pgko

Public applications and shared packages for [pgko](https://pgko.dev/).

| Path                                   | Contents                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| [apps/web](apps/web/README.md)         | React frontend                                                |
| [apps/openapi](apps/openapi/README.md) | Public API reference                                          |
| [apps/worker](apps/worker/README.md)   | Crawler previews                                              |
| [packages](docs/packages.md)           | Shared validation, translations, helpers, and chart rendering |

## Prerequisites

Bun, Node.js, and Git LFS. Tool versions are maintained in [package.json](package.json) and [CI workflows](.github/workflows).

## Quick start

Run from this repository's root:

```sh
git lfs pull
bun ci --ignore-scripts
cp apps/web/.env.development.example apps/web/.env.development.local
bun run dev
```

Open [localhost:3001](http://localhost:3001). For local API access, start the API on port 3000.

## Common commands

| Command                  | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `bun run dev`            | Watch shared packages and start the frontend                   |
| `bun run dev:worker`     | Watch shared packages and start the Worker                     |
| `bun run dev:openapi`    | Build and preview the API reference                            |
| `bun run build`          | Build all packages and applications                            |
| `bun run check`          | Check dependencies, types, lint, formatting, tests, and builds |
| `bun run check:packages` | Build, type-check, and test shared packages                    |
| `bun run fmt:w`          | Format the workspace                                           |

## Documentation

- [Development and browser tests](docs/development.md)
- [Package exports and usage notes](docs/packages.md)
- [Package releases](docs/releases.md)
- [Application deployment](docs/deployment.md)

[MIT license](LICENSE).
