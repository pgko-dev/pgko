import { Check, ChevronDown, Layers, Tag, X } from "lucide-react";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import * as v from "valibot";

import { BundleRules } from "@pgko.dev/config";
import { BundleFilterRules, tBundleTagsSchema, type BundleListQuery } from "@pgko.dev/schema";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { TagSuggestionInput } from "./tag-suggestion-input";

export type BundleFilterValues = Pick<BundleListQuery, "diff" | "tag">;
const DIFFICULTY_NAMES: Record<number, string> = {
  0: "BASIC",
  1: "ADVANCED",
  2: "EXPERT",
  3: "MASTER",
  5: "ULTIMA",
  4: "WORLD’S END",
};

function FilterPopover({
  label,
  active,
  icon,
  children,
  contentClassName,
}: Readonly<{
  label: string;
  active: boolean;
  icon?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}>) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant={active ? "secondary" : "outline"} size="sm" />}>
        {icon}
        {label}
        <ChevronDown className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("max-w-[calc(100vw-2rem)] gap-2 p-2", contentClassName)}
      >
        <PopoverTitle className="sr-only">{label}</PopoverTitle>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function BundleFilterOptions({
  value,
  onChange,
  sorter,
  extraFilters,
}: Readonly<{
  value: BundleFilterValues;
  onChange: (value: BundleFilterValues) => void;
  sorter: ReactNode;
  extraFilters?: ReactNode;
}>) {
  const { t } = useTranslation();
  const difficulties = value.diff ?? [];
  const tags = value.tag ?? [];
  const chips = difficulties.map((difficulty) => ({
    key: `difficulty-${difficulty}`,
    label: DIFFICULTY_NAMES[difficulty]!,
    remove: () => onChange({ ...value, diff: difficulties.filter((item) => item !== difficulty) }),
  }));
  chips.push(
    ...tags.map((tag) => ({
      key: `tag-${tag}`,
      label: tag,
      remove: () => onChange({ ...value, tag: tags.filter((item) => item !== tag) }),
    })),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div
          data-testid="bundle-sorter"
          className="flex w-max max-w-full flex-none flex-wrap items-center gap-2"
        >
          {sorter}
        </div>
        <div
          data-testid="bundle-filters"
          className="flex w-max max-w-full flex-none flex-wrap items-center gap-2"
        >
          <FilterPopover
            label={t("ui.bundleList.filters.difficulty")}
            active={difficulties.length > 0}
            icon={<Layers />}
          >
            <div className="grid grid-cols-2 gap-1.5">
              {BundleFilterRules.difficulties.map((difficulty) => (
                <Button
                  key={difficulty}
                  size="sm"
                  className="justify-between"
                  variant={difficulties.includes(difficulty) ? "secondary" : "ghost"}
                  aria-pressed={difficulties.includes(difficulty)}
                  onClick={() =>
                    onChange({
                      ...value,
                      diff: difficulties.includes(difficulty)
                        ? difficulties.filter((item) => item !== difficulty)
                        : [...difficulties, difficulty],
                    })
                  }
                >
                  {DIFFICULTY_NAMES[difficulty]}
                  {difficulties.includes(difficulty) && <Check />}
                </Button>
              ))}
            </div>
          </FilterPopover>
          <FilterPopover
            label={t("ui.bundleList.filters.tags")}
            active={tags.length > 0}
            icon={<Tag />}
            contentClassName="gap-0 p-0"
          >
            <TagSuggestionInput
              label={t("ui.bundleList.filters.tags")}
              placeholder={t("ui.bundleList.filters.tagPlaceholder")}
              selected={tags}
              maxLength={BundleRules.tag.maxLength}
              onAdd={(input) => {
                const parsed = v.safeParse(tBundleTagsSchema(t), [
                  ...new Set([...tags, input.trim().toLowerCase()]),
                ]);

                if (!parsed.success) {
                  return parsed.issues[0].message;
                }

                onChange({ ...value, tag: parsed.output });
                return undefined;
              }}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t p-2">
                {tags.map((tag) => (
                  <Button
                    key={tag}
                    variant="secondary"
                    size="xs"
                    aria-label={t("ui.bundleList.filters.remove", { value: tag })}
                    onClick={() => onChange({ ...value, tag: tags.filter((item) => item !== tag) })}
                  >
                    {tag}
                    <X />
                  </Button>
                ))}
              </div>
            )}
          </FilterPopover>
          {extraFilters}
        </div>
      </div>
      {chips.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label={t("ui.bundleList.filters.active")}
        >
          {chips.map((chip) => (
            <Button
              key={chip.key}
              variant="secondary"
              size="xs"
              className="max-w-full font-normal"
              aria-label={t("ui.bundleList.filters.remove", { value: chip.label })}
              onClick={chip.remove}
            >
              <span className="truncate">{chip.label}</span>
              <X />
            </Button>
          ))}
          <Button variant="ghost" size="xs" onClick={() => onChange({})}>
            {t("ui.bundleList.filters.clear")}
          </Button>
        </div>
      )}
    </div>
  );
}
