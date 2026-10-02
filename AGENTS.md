# pgko

Public Bun workspace: applications in `apps/*`, shared packages in `packages/*`. See `README.md` for setup and commands.

## Repository constraints

- Public builds must work without private checkouts. Keep API implementation, database schemas, credentials, and server configuration in the private repositories.
- Install from the root. Define external versions in the root catalog and use `catalog:` in manifests; use `workspace:*` for local packages. Package exports read `dist`, so build packages before running an app directly.
- Change route sources instead of `apps/web/src/routeTree.gen.ts`. For Worker bindings, edit `apps/worker/wrangler.toml` and regenerate `worker-configuration.d.ts` with `bun run --cwd apps/worker types`.
- Import only the API's exported OpenAPI contract into `apps/openapi`; review the public diff. Browser `PUBLIC_*` values are visible to users.
- Public packages release together. When preparing a release, use `bun run version:packages <version>` and `bun run release:check`. Internal app changes do not require npm publication.

## Conventions

- Follow Oxlint and Oxfmt. Separate logical steps with blank lines; use braces and descriptive names for complex expressions, regexes, and long lists. Share repeated definitions with the same meaning.
- Keep documentation concise and useful to experienced maintainers.
- Verify the affected behavior. Use `bun run check` for workspace-wide changes and `bun run release:check` for published artifacts. Local checks and builds do not deploy.
- Carry the requested change through implementation and relevant verification. Fix failures introduced by the change and report any remaining blocker.
