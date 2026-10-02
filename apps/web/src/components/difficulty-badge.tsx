import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { getDifficultyBadgeStyle, type DifficultyBadgeSize } from "@/lib/difficulty";
import { cn } from "@/lib/utils";

/** Fixed width shared by all level pills (mini, chip). */
export const DIFFICULTY_LEVEL_PILL_WIDTH = "w-8";

const sizeClassName = {
  /** Bundle card song popover: fixed-width solid badge. */
  mini: cn(
    DIFFICULTY_LEVEL_PILL_WIDTH,
    "grid h-3 shrink-0 place-items-center overflow-hidden px-1 text-center text-[10px] leading-[12px] font-semibold tabular-nums",
  ),
  /** Bundle card level strip, song panel, etc.: fixed-width tinted chip. */
  chip: cn(
    DIFFICULTY_LEVEL_PILL_WIDTH,
    "inline-flex shrink-0 items-center justify-center overflow-hidden px-1 py-px text-center text-[11px] leading-none font-semibold tabular-nums",
  ),
} as const satisfies Record<DifficultyBadgeSize, string>;

export type { DifficultyBadgeSize };

export type DifficultyBadgeProps = Omit<ComponentProps<"span">, "children" | "style"> & {
  difficulty: number;
  size: DifficultyBadgeSize;
  children: ReactNode;
  style?: CSSProperties;
};

export function DifficultyBadge({
  difficulty,
  size,
  className,
  style,
  children,
  ...props
}: DifficultyBadgeProps) {
  return (
    <span
      className={cn(sizeClassName[size], className)}
      style={{ ...getDifficultyBadgeStyle(difficulty, size), ...style }}
      {...props}
    >
      {children}
    </span>
  );
}
