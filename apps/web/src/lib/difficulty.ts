import type { CSSProperties } from "react";

export const DIFFICULTY_COLORS: Record<number, string> = {
  0: "var(--diff-basic)",
  1: "var(--diff-advanced)",
  2: "var(--diff-expert)",
  3: "var(--diff-master)",
  4: "var(--diff-we)",
  5: "var(--diff-ultima)",
};

export type DifficultyBadgeSize = "mini" | "chip";

function difficultyTint(levelColor: string, opacity: number): string {
  return `color-mix(in srgb, ${levelColor} ${opacity}%, transparent)`;
}

/** Solid pill for dense rows (popover). Tinted chip for card strip & song panel. */
export function getDifficultyBadgeStyle(
  difficulty: number,
  size: DifficultyBadgeSize,
): CSSProperties {
  const isWorldsEnd = difficulty === 4;
  const color = DIFFICULTY_COLORS[difficulty] ?? "#666666";

  if (size === "chip") {
    const tint = isWorldsEnd ? 12 : 18;
    const ring = isWorldsEnd ? 28 : 35;
    return {
      backgroundColor: difficultyTint(color, tint),
      color,
      boxShadow: `inset 0 0 0 1px ${difficultyTint(color, ring)}`,
    };
  }

  if (isWorldsEnd) {
    return {
      backgroundColor: "var(--diff-we)",
      color: "var(--diff-we-text)",
    };
  }

  return {
    backgroundColor: color,
    color: "#ffffff",
    textShadow: "0 0 1px rgba(0,0,0,0.55)",
  };
}
