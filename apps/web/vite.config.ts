import path from "node:path";

import mdx from "@mdx-js/rollup";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv, type UserConfig } from "vite";

export default defineConfig(({ mode }) => {
  const publicEnv = loadEnv(mode, import.meta.dirname, "PUBLIC_");
  const sentryBuildEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN);
  const sourcemap: "hidden" | false = sentryBuildEnabled ? "hidden" : false;

  return {
    envPrefix: "PUBLIC",
    plugins: [
      devtools(),
      { enforce: "pre", ...mdx({ jsxImportSource: "react" }) },
      tanstackRouter({
        autoCodeSplitting: false,
        target: "react",
      }),
      react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
      tailwindcss(),
      visualizer({ template: "markdown", filename: "dist/bundle-stats.md" }),
      visualizer({ filename: "dist/bundle-stats.html" }),
      sentryVitePlugin({
        bundleSizeOptimizations: {
          excludeDebugStatements: true,
        },
        disable: !sentryBuildEnabled,
        reactComponentAnnotation: { enabled: true },
        release: {
          name: process.env.SENTRY_RELEASE,
          setCommits: {
            auto: true,
            ignoreEmpty: true,
            ignoreMissing: true,
          },
        },
        sourcemaps: {
          filesToDeleteAfterUpload: "./dist/**/*.map",
        },
        telemetry: false,
      }),
    ],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "initial-framework",
                test: /node_modules[\\/](?:@tanstack|react(?:-dom)?|scheduler)[\\/]/,
                tags: ["$initial"],
                priority: 30,
              },
              {
                name: "initial-ui",
                test: /node_modules[\\/](?:@base-ui|lucide-react|motion(?:-dom|-utils)?|sonner)[\\/]/,
                tags: ["$initial"],
                priority: 20,
              },
              {
                name: "initial-vendor",
                test: /node_modules[\\/]/,
                tags: ["$initial"],
                priority: 10,
              },
              {
                name: "initial-app",
                tags: ["$initial"],
              },
            ],
          },
        },
      },
      sourcemap,
    },
    define: {
      "import.meta.env.PUBLIC_BUILD_TIME": JSON.stringify(new Date().toISOString()),
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 3001,
      proxy: {
        "/api": {
          target: publicEnv.PUBLIC_API_URL || "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  } satisfies UserConfig;
});
