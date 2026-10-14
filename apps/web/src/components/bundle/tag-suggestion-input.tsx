import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@/components/custom/autocomplete";
import { Button } from "@/components/ui/button";
import { InputGroupAddon } from "@/components/ui/input-group";
import { ScrollAreaRoot, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useBundleTagSuggestions } from "@/hooks/query/use-bundle-tag-suggestions";

export function TagSuggestionInput({
  label,
  placeholder,
  selected,
  maxLength,
  onAdd,
}: Readonly<{
  label: string;
  placeholder: string;
  selected: string[];
  maxLength: number;
  onAdd: (value: string) => string | undefined;
}>) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const id = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const suggestions = useBundleTagSuggestions(input);
  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError, waiting } = suggestions;
  const selectedTags = new Set(selected);
  const items = suggestions.items.filter((item) => !selectedTags.has(item));

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetching || isFetchNextPageError || waiting) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { root: viewportRef.current, rootMargin: "0px 0px 64px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetching, isFetchNextPageError, waiting]);

  function add(value: string) {
    const message = onAdd(value);
    setError(message);
    if (!message) {
      setInput("");
    }
  }

  return (
    <Autocomplete
      inline
      open
      mode="none"
      items={items}
      value={input}
      onValueChange={(value) => {
        setInput(value);
        setError(undefined);
      }}
      onItemHighlighted={(item, details) => {
        if (
          details.reason === "keyboard" &&
          item &&
          items.indexOf(item) >= items.length - 3 &&
          hasNextPage &&
          !isFetching &&
          !waiting &&
          !isFetchNextPageError
        ) {
          void fetchNextPage();
        }
      }}
    >
      <div className="border-b p-2">
        <AutocompleteInput
          showTrigger={false}
          aria-label={label}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.nativeEvent.isComposing &&
              !event.currentTarget.getAttribute("aria-activedescendant")
            ) {
              event.preventDefault();
              if (input.trim()) {
                add(input);
              }
            }
          }}
        >
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </AutocompleteInput>
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <ScrollAreaRoot className="p-1">
        <ScrollAreaViewport ref={viewportRef} className="h-auto max-h-44">
          <AutocompleteList aria-label={label} className="max-h-none overflow-visible">
            {(item: string) => (
              <AutocompleteItem key={item} value={item} onClick={() => add(item)}>
                <span className="truncate">{item}</span>
              </AutocompleteItem>
            )}
          </AutocompleteList>
          <div ref={sentinelRef} className="h-px" />
          {(isFetching || waiting) && (
            <div role="status" aria-label={t("ui.loading")} className="flex justify-center py-2">
              <Spinner className="size-4 text-muted-foreground" />
            </div>
          )}
          {!isFetching && !waiting && suggestions.isError && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                if (isFetchNextPageError) {
                  void fetchNextPage();
                } else {
                  void suggestions.refetch();
                }
              }}
            >
              {t("ui.errorPage.retry")}
            </Button>
          )}
          {!isFetching && !waiting && !suggestions.isError && !items.length && (
            <p role="status" className="px-2 py-4 text-center text-sm text-muted-foreground">
              {t("ui.bundleList.filters.noSuggestions")}
            </p>
          )}
        </ScrollAreaViewport>
        <ScrollBar />
      </ScrollAreaRoot>
    </Autocomplete>
  );
}
