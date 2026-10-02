# pgko web

React frontend. From the repository root:

```sh
cp apps/web/.env.development.example apps/web/.env.development.local
bun run dev:web
bun run build:web
```

Open `http://localhost:3001`. Set `PUBLIC_API_URL` to an API origin, or leave it empty to proxy `/api` to `http://localhost:3000`. All `PUBLIC_*` values are visible in the browser.

Deploy manually from `main` to Cloudflare Pages with `deploy-web.yml`.
