# pgko worker

Cloudflare crawler previews for bundle and user pages. From the repository root:

```sh
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
bun run dev:worker
bun run build:worker
```

Set `API_ORIGIN` in `.dev.vars` to an API origin. Routes and production settings are in `wrangler.toml`. Regenerate bindings with `bun run --cwd apps/worker types`.

`deploy-worker.yml` deploys manually from `main`, using Cloudflare credentials in the `worker-production` environment.
