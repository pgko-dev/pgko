"use client";

import { X } from "lucide-react";
import type React from "react";
import { useCallback } from "react";

import { cn } from "@/lib/utils";

export interface InputTagsProps extends Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "maxLength" | "pattern" | "autoCapitalize"
> {
  value: string[];
  onChange: (value: string[]) => void;
  inputGroup?: boolean;
  /**
   * Maximum length per individual tag.
   */
  maxLength?: number;
  /**
   * Maximum number of tags allowed.
   */
  maxTags?: number;
  /**
   * Auto-capitalization behavior for the underlying input.
   */
  autoCapitalize?: React.HTMLAttributes<HTMLInputElement>["autoCapitalize"];
  /**
   * Pattern applied to the underlying input element.
   */
  pattern?: string;
  /**
   * Forwarded ref for the underlying input.
   */
  ref?: React.Ref<HTMLInputElement>;
}

function InputTags({
  className,
  inputGroup,
  onChange,
  value: tags,
  maxLength,
  maxTags,
  autoCapitalize,
  pattern,
  ref,
  ...props
}: Readonly<InputTagsProps>) {
  const handleRemove = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [onChange, tags],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const { value } = e.currentTarget;
      const values = value
        .split(/[,;]+/u)
        .map((v) => v.trim())
        .filter(Boolean);

      if (values.length) {
        if ([",", ";", "Enter"].includes(e.key)) {
          e.preventDefault();
          const limitedValues = maxLength ? values.map((v) => v.slice(0, maxLength)) : values;
          const merged = [...new Set([...tags, ...limitedValues])];
          const next = typeof maxTags === "number" ? merged.slice(0, maxTags) : merged;
          onChange(next);
          e.currentTarget.value = "";
        }
      } else if (e.key === "Backspace" && tags.length) {
        e.preventDefault();
        onChange(tags.slice(0, -1));
      }
    },
    [maxLength, maxTags, onChange, tags],
  );

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-1 p-1.5 text-sm transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
        inputGroup
          ? "min-h-8 flex-1 rounded-none border-0 bg-transparent px-2 py-1.5 shadow-none ring-0 has-[input:focus-visible]:ring-0 dark:bg-transparent dark:disabled:bg-transparent"
          : "min-h-10 rounded-md border border-input bg-transparent has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50",
        className,
      )}
    >
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-foreground/[0.06] px-1.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.1] dark:border-border/40 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
        >
          <span>{t}</span>
          <button
            type="button"
            className="inline-flex rounded-full text-muted-foreground transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none"
            aria-label={`Remove tag ${t}`}
            onClick={() => handleRemove(t)}
          >
            <X className="size-2.5 cursor-pointer" data-slot="icon" />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        data-slot={inputGroup ? "input-group-control" : undefined}
        className={cn(
          "h-8 min-w-0 flex-1 appearance-none border-0 bg-transparent px-1 py-0 text-sm font-medium text-foreground ring-0 transition-all duration-200 ease-out outline-none placeholder:text-zinc-500 placeholder:capitalize focus:outline-none dark:text-white",
          tags.length ? "w-0 placeholder:opacity-0" : "",
        )}
        type="text"
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        pattern={pattern}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </div>
  );
}

InputTags.displayName = "InputTags";

export default InputTags;
