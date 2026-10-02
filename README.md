# pgko

Public applications and shared packages for [pgko](https://pgko.dev/).

| Path                         | Contents                      |
| ---------------------------- | ----------------------------- |
| [apps/web](apps/web)         | Frontend                      |
| [apps/openapi](apps/openapi) | API reference                 |
| [apps/worker](apps/worker)   | Cloudflare Worker             |
| [packages](packages)         | Public `@pgko-dev/*` packages |

## Development

Use Bun 1.4.2, Node.js 24, and Git LFS. Run commands from this root:

```sh
git lfs pull
bun ci --ignore-scripts
bun run dev
bun run check
```

`dev` watches shared packages and starts the frontend. Use `dev:worker` or `dev:openapi` for the other apps. Internal dependencies use `workspace:*`.

## Package releases

Packages release together for external consumers. Run `bun run version:packages <version>` and `bun run release:check`, then commit and push a matching `v<version>` tag. Prereleases use `next`.

## License

[MIT](LICENSE).
