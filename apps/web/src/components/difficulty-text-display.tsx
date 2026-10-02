import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { DIFFICULTY_COLORS } from "@/lib/difficulty";
import { cn } from "@/lib/utils";

const baseClass =
  "inline-flex min-w-0 items-center text-xs font-semibold tabular-nums leading-none tracking-tight";

/** `accent`: CSS vars / chart colors. `on-surface`: World's End uses fg for contrast on unknown background. */
export type DifficultyTextTone = "accent" | "on-surface";

export type DifficultyTextDisplayProps = Omit<ComponentProps<"span">, "children" | "style"> & {
  difficulty: number;
  /** @default "accent" */
  tone?: DifficultyTextTone;
  children: ReactNode;
  style?: CSSProperties;
};

export function DifficultyTextDisplay({
  difficulty,
  tone = "accent",
  className,
  children,
  style,
  ...props
}: DifficultyTextDisplayProps) {
  const isWe = difficulty === 4;
  const cssColor = DIFFICULTY_COLORS[difficulty];
  let difficultyClassName = !cssColor ? "text-muted-foreground" : undefined;
  if (isWe) {
    difficultyClassName =
      tone === "on-surface" ? "text-black dark:text-white" : "text-[var(--diff-we)]";
  }

  return (
    <span
      className={cn(baseClass, difficultyClassName, className)}
      style={{
        ...(!isWe && cssColor ? { color: cssColor } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
