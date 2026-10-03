# pgko

- Install from the root. External dependency versions belong in the root catalog (`catalog:`); local packages use `workspace:*`. Package exports read `dist`, so build packages before running apps directly.
- Edit route sources, not `apps/web/src/routeTree.gen.ts`. For Worker bindings, edit `apps/worker/wrangler.toml`, then run `bun run --cwd apps/worker types`.
- Keep credentials and private implementation details out of public source and artifacts. Public docs must not link to private repositories. Browser `PUBLIC_*` values are public. Import only the exported public OpenAPI contract into `apps/openapi`.
- Public packages release together; use [docs/releases.md](docs/releases.md) when versioning or publishing. App changes alone do not require npm publication.
- Follow Oxlint/Oxfmt; separate logical steps with blank lines. Use Conventional Commits with workspace directory names as scopes, or `repo` outside apps and packages.

## Documentation

- READMEs cover overview, prerequisites, quick start, common commands, and links. Update them only for these changes; keep tool and dependency versions in repository configuration.
- Keep architecture, implementation, workflow, and deployment details in `docs/`. Update feature docs with code changes; link from READMEs.
