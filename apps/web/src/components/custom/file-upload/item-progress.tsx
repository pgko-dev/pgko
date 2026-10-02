"use client";

import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { useTranslation } from "react-i18next";

import type { TranslationKey } from "@pgko-dev/i18n";

import { extractTranslationKeys } from "@/lib/parse-error";
import { cn } from "@/lib/utils";

import { ITEM_PROGRESS_NAME, useFileUploadItemContext } from "./context";
import { mergeRenderProps } from "./utils";

interface FileUploadItemProgressProps extends useRender.ComponentProps<"div"> {
  variant?: "linear" | "circular" | "fill";
  size?: number;
  forceMount?: boolean;
}

function FileUploadItemProgress(props: FileUploadItemProgressProps) {
  const { variant = "linear", size = 40, render, forceMount, className, ...progressProps } = props;
  const { t } = useTranslation();

  const itemContext = useFileUploadItemContext(ITEM_PROGRESS_NAME);
  const fileState = itemContext.fileState;
  const fileStateError = fileState?.error;

  const hasError = fileState?.status === "error";
  const isProcessing = fileState?.status === "processing";
  const isTerminal = fileState?.status === "success" || hasError;
  const shouldRender = forceMount || !isTerminal || hasError;

  const errorKeys = React.useMemo(
    () => (fileStateError ? extractTranslationKeys(fileStateError) : []),
    [fileStateError],
  );

  const baseProgressProps = fileState
    ? {
        role: "progressbar" as const,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        // While the server processes the upload there is no real percentage to report,
        // so expose it as a busy/indeterminate progressbar instead of a fixed value.
        ...(isProcessing
          ? { "aria-busy": true as const }
          : {
              "aria-valuenow": fileState.progress,
              "aria-valuetext": `${fileState.progress}%`,
            }),
        "aria-labelledby": itemContext.nameId,
        "data-slot": "file-upload-progress",
      }
    : { "data-slot": "file-upload-progress" as const };

  const progressRenderProps = (() => {
    // Show error messages in place of the progress bar
    if (hasError && errorKeys.length > 0) {
      return mergeRenderProps<"div">(
        {
          "data-slot": "file-upload-progress",
          children: (
            <>
              {errorKeys.map((key: TranslationKey) => (
                <span key={key} id={itemContext.messageId} className="text-xs text-destructive">
                  {t(key)}
                </span>
              ))}
            </>
          ),
        },
        progressProps,
      );
    }

    if (!fileState || !shouldRender) {
      return mergeRenderProps<"div">({}, progressProps);
    }
    switch (variant) {
      case "circular": {
        const circumference = 2 * Math.PI * ((size - 4) / 2);
        const strokeDashoffset = circumference - (fileState.progress / 100) * circumference;
        return mergeRenderProps<"div">(
          {
            ...baseProgressProps,
            className: cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", className),
            children: (
              <svg
                className={cn("transform", isProcessing ? "animate-spin" : "-rotate-90")}
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                fill="none"
                stroke="currentColor"
              >
                <circle
                  className="text-primary/20"
                  strokeWidth="2"
                  cx={size / 2}
                  cy={size / 2}
                  r={(size - 4) / 2}
                />
                <circle
                  className={cn(
                    "text-primary",
                    !isProcessing && "transition-[stroke-dashoffset] duration-300 ease-linear",
                  )}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={
                    isProcessing ? `${circumference * 0.25} ${circumference}` : circumference
                  }
                  strokeDashoffset={isProcessing ? 0 : strokeDashoffset}
                  cx={size / 2}
                  cy={size / 2}
                  r={(size - 4) / 2}
                />
              </svg>
            ),
          },
          progressProps,
        );
      }
      case "fill": {
        if (isProcessing) {
          return mergeRenderProps<"div">(
            {
              ...baseProgressProps,
              className: cn("absolute inset-0 animate-pulse bg-primary/50", className),
            },
            progressProps,
          );
        }
        const progressPercentage = fileState.progress;
        const topInset = 100 - progressPercentage;
        return mergeRenderProps<"div">(
          {
            ...baseProgressProps,
            "aria-valuenow": progressPercentage,
            "aria-valuetext": `${progressPercentage}%`,
            className: cn(
              "absolute inset-0 bg-primary/50 transition-[clip-path] duration-300 ease-linear",
              className,
            ),
            style: {
              clipPath: `inset(${topInset}% 0% 0% 0%)`,
            },
          },
          progressProps,
        );
      }
      default:
        return mergeRenderProps<"div">(
          {
            ...baseProgressProps,
            className: cn(
              "relative h-1.5 w-full overflow-hidden rounded-full bg-primary/20",
              className,
            ),
            children: isProcessing ? (
              <div
                className="absolute inset-y-0 w-1/3 rounded-full bg-primary"
                style={{
                  animation: "file-upload-indeterminate 1.1s ease-in-out infinite",
                }}
              />
            ) : (
              <div
                className="h-full w-full flex-1 bg-primary transition-transform duration-300 ease-linear"
                style={{
                  transform: `translateX(-${100 - fileState.progress}%)`,
                }}
              />
            ),
          },
          progressProps,
        );
    }
  })();

  const progressElement = useRender({
    defaultTagName: "div",
    render,
    props: progressRenderProps,
  });

  if (!fileState) return null;
  if (!shouldRender) return null;
  return progressElement;
}

export { FileUploadItemProgress, type FileUploadItemProgressProps };
