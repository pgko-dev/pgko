import path from "node:path";

import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  envPrefix: "PUBLIC",
  plugins: [
    { enforce: "pre", ...mdx({ jsxImportSource: "react" }) },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
    tailwindcss(),
  ],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "../src") } },
  optimizeDeps: {
    entries: [
      "e2e/browser/bundle.html",
      "e2e/browser/preview.html",
    ],
    exclude: ["ugc-render"],
  },
  build: {
    assetsInlineLimit: 0,
    outDir: "test-results/preview-site",
    rolldownOptions: {
      input: [
        "e2e/browser/bundle.html",
        "e2e/browser/preview.html",
        ],
    },
  },
});
