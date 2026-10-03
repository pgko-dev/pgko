import i18n from "i18next";
import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { initReactI18next } from "react-i18next";

import { languageResources } from "@pgko.dev/i18n/all";

import { Button } from "../../src/components/ui/button";
import { ThemeProvider, useTheme } from "../../src/integrations/theme-provider";
import "../../src/index.css";

await i18n
  .use(initReactI18next)
  .init({ lng: "en", fallbackLng: "en", resources: languageResources });

export function Harness({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="preview-test-theme">
      <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Beatmap preview lab</h1>
          <ThemeControls />
        </header>
        {children}
      </main>
    </ThemeProvider>
  );
}

function ThemeControls() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex gap-1" role="group" aria-label="Theme">
      <Button
        size="sm"
        variant="outline"
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
      >
        <Sun /> Light
      </Button>
      <Button
        size="sm"
        variant="outline"
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
      >
        <Moon /> Dark
      </Button>
    </div>
  );
}
