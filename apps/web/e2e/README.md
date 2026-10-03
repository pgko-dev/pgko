# Browser tests

- `browser/`: pages and workers served by Vite; browser APIs only.
- `node/`: Playwright tests, request mocks, and fixture generation.
- `fixtures/`: authored beatmap data and generated audio.

Run `bun run test:browser` from `apps/web`. The normal `tsc` check covers both environments separately.

For manual testing, run `bun run dev:preview` from `apps/web` and open [the preview lab](http://127.0.0.1:43179/e2e/browser/preview.html). It builds the shared packages first. Load a local `.ugc` and optional music, or open the built-in fixture. Files stay in the browser. Light and dark themes use the site's theme provider and components.
