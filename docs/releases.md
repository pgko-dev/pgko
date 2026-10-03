# Package releases

All public packages publish under `@pgko.dev` and share one version. The release list and build order live in `scripts/packages.ts`. Internal application changes do not require npm publication.

## Prepare a release

From the repository root, replace `<version>` with the chosen version:

```sh
bun run version:packages <version>
bun run release:check
```

The version script updates every public package, refreshes the lockfile, checks dependency and release metadata, and formats the workspace. Review and commit the changes, then push a matching `v<version>` tag.

`release:check` builds and tests packages and runs `pack:check`. The packed consumer checks inspect tarball contents, resolve local dependency protocols, load exports under Node and Bun, and check browser and Bun TypeScript consumers.

## Publication

[`publish.yml`](../.github/workflows/publish.yml) publishes matching `v*` tags from `pgko-dev/pgko`. Manual dispatch also requires a version tag. Each package needs npm trusted publishing configured for this workflow.

The workflow packs artifacts and publishes in dependency order:

- Stable versions use the `latest` dist-tag.
- Versions containing a prerelease suffix use `next`.
- An existing version is skipped only when its tarball integrity matches.
- Different contents at an existing version require a new version.

After publishing, the workflow waits for all package versions to become installable from npm. On a partial failure, inspect the registry and workflow result before retrying.

## Consumers

Workspace consumers use `workspace:*`. External consumers use the published versions. Update related `@pgko.dev/*` dependencies together through the consumer repository's dependency policy.
