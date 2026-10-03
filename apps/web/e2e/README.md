# Browser tests

Playwright tests and a local chart preview lab for the frontend.

Complete the [workspace setup](../../../README.md#quick-start), then run from `apps/web`:

```sh
bun x --no-install playwright install
bun run test:browser
```

Run a single browser with `bun run test:browser --project=chromium`.

For manual testing:

```sh
bun run dev:preview
```

Open [the preview lab](http://127.0.0.1:43179/e2e/browser/preview.html) and load a local `.ugc` file with optional music, or use the built-in fixture.

See [browser test environments and fixtures](../../../docs/development.md#browser-tests).
