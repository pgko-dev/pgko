import i18n from "i18next";
import { FileAudio, FileCodeCorner, Image } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ProcessResult } from "@pgko.dev/schema";

import { AutoScrollMarquee } from "@/components/auto-scroll-marquee";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function formatContext(context: unknown): string {
  if (context === null || context === undefined) return "";
  if (typeof context === "object") return JSON.stringify(context, null, 2);
  if (typeof context === "string") return context;
  if (typeof context === "symbol") return context.toString();
  if (typeof context === "bigint") return context.toString();
  // number or boolean only
  const value = context as number | boolean;
  return String(value);
}

export function ProcessResultRow({ result }: Readonly<{ result: ProcessResult }>) {
  const { t } = useTranslation();
  const failedRet = !result.ret.success && "message" in result.ret ? result.ret : null;
  const message = failedRet?.message ?? null;
  const context = failedRet && "context" in failedRet ? failedRet.context : undefined;
  const hasContext = context !== undefined && context !== null;
  let TypeIcon = FileCodeCorner;
  if (result.type === "jacket") {
    TypeIcon = Image;
  } else if (result.type === "preview") {
    TypeIcon = FileAudio;
  }

  const rowContent = (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        <TypeIcon
          className={cn("shrink-0 text-destructive", hasContext ? "size-4" : "size-4.5")}
          aria-hidden
        />
        <AutoScrollMarquee className="text-md flex-1 text-destructive">
          {result.filePath}
        </AutoScrollMarquee>
      </div>
      {message != null && (
        <div className="border-destructive/50 text-sm text-destructive">
          <AutoScrollMarquee>{i18n.t(message as never)}</AutoScrollMarquee>
        </div>
      )}
    </>
  );

  if (!hasContext) {
    return (
      <li
        className={cn(
          "flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm",
          "dark:bg-muted/20",
        )}
      >
        {rowContent}
      </li>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={
          <li
            className={cn(
              "flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm",
              "dark:bg-muted/20",
              "cursor-pointer list-none",
            )}
          />
        }
      >
        {rowContent}
      </PopoverTrigger>
      <PopoverContent
        className="flex h-[16rem] max-w-[min(90vw,24rem)] flex-col overflow-hidden p-0"
        align="start"
      >
        <PopoverHeader className="shrink-0 px-3 pt-3">
          <PopoverTitle>{t("ui.uploadDetail.results.contextTitle")}</PopoverTitle>
        </PopoverHeader>
        <ScrollArea className="min-h-0 flex-1 overflow-hidden border-t border-border">
          <pre className="rounded bg-muted/80 p-2 font-mono text-xs break-words whitespace-pre-wrap text-muted-foreground">
            {formatContext(context)}
          </pre>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
