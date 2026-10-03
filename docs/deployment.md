# Application deployment

Application workflows deploy from `main`: pushes that pass [`check.yml`](../.github/workflows/check.yml) call all three deployment workflows. Each workflow also supports manual dispatch. Package publication is separate; see [releases](releases.md). Local check and build commands do not deploy.

## Web

[`deploy-web.yml`](../.github/workflows/deploy-web.yml) deploys `apps/web/dist` to Cloudflare Pages. Run **Deploy web** manually from `main`.

Configure the `production` environment:

| Setting                                                 | Purpose                                   |
| ------------------------------------------------------- | ----------------------------------------- |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`         | Cloudflare access                         |
| `CLOUDFLARE_PAGES_PROJECT_NAME`                         | Optional project name; defaults to `pgko` |
| `PUBLIC_API_URL`, `PUBLIC_COOKIE_DOMAIN`                | Browser API and cookie settings           |
| `PUBLIC_SENTRY_DSN`, `PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Browser telemetry                         |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`     | Optional build-time source map upload     |

The normal manual run performs the workspace check. `skip_checks` builds the web application without that check; reusable workflow calls build the application directly. Browser-visible settings use `PUBLIC_*`; keep the Sentry upload token private.

## Worker

[`deploy-worker.yml`](../.github/workflows/deploy-worker.yml) runs **Deploy worker** with credentials from `worker-production`:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Production routes and `API_ORIGIN` are configured in `apps/worker/wrangler.toml`. Manual dispatch checks the workspace before deployment; reusable calls build the Worker first.

## API reference

[`deploy-openapi.yml`](../.github/workflows/deploy-openapi.yml) builds `apps/openapi/dist` and deploys it to GitHub Pages using the `github-pages` environment.

Run **Deploy API reference** after importing and reviewing the exported public contract. Manual dispatch checks the workspace; reusable calls build the reference directly. The deployment job uses Pages and OIDC permissions.
