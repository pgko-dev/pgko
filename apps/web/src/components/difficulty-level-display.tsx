import { DifficultyBadge } from "@/components/difficulty-badge";
import { DifficultyTextDisplay } from "@/components/difficulty-text-display";

/** Tinted single-line level text for narrow cells (e.g. representative video picker). */
export function DifficultyLevelInline({
  difficulty,
  level,
  constant,
  weAttribute,
}: Readonly<{
  difficulty: number;
  level: string;
  constant: number;
  weAttribute: string | null;
}>) {
  if (difficulty === 4) {
    const content = (
      <>
        {weAttribute ? <span>{weAttribute}</span> : null}
        {weAttribute ? " " : null}
        <span role="img" aria-label={`${level} stars`}>
          {level}★
        </span>
      </>
    );
    return (
      <DifficultyTextDisplay difficulty={4} tone="on-surface" className="whitespace-nowrap">
        {content}
      </DifficultyTextDisplay>
    );
  }

  return (
    <DifficultyTextDisplay difficulty={difficulty} tone="on-surface" className="whitespace-nowrap">
      <span>
        {level} ({constant.toFixed(1)})
      </span>
    </DifficultyTextDisplay>
  );
}

/** Level chip + tinted constant (or WE chip + stars). */
export function DifficultyLevelChip({
  difficulty,
  level,
  constant,
  weAttribute,
}: Readonly<{
  difficulty: number;
  level: string;
  constant: number;
  weAttribute: string | null;
}>) {
  let levelStr = level;
  let constantStr = constant.toFixed(1);
  if (difficulty === 4) {
    levelStr = weAttribute?.trim() || "WE";
    constantStr = `${level}★`;
  }

  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
      <DifficultyBadge difficulty={difficulty} size="chip">
        {levelStr}
      </DifficultyBadge>
      <DifficultyTextDisplay difficulty={difficulty}>{constantStr}</DifficultyTextDisplay>
    </span>
  );
}
