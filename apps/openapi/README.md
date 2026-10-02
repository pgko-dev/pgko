# pgko API reference

Public OpenAPI contract and reference site. From the repository root:

```sh
bun run dev:openapi
```

Preview: `http://127.0.0.1:4173/`. Import the API's exported spec with `bun run --cwd apps/openapi spec:import <generated-openapi.json>`, then review and commit.

`deploy-openapi.yml` deploys manually from `main` to GitHub Pages.
