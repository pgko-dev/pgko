"use client";

import { useRender } from "@base-ui/react/use-render";

import { cn } from "@/lib/utils";

import { LIST_NAME, useFileUploadContext, useFileUploadStore } from "./context";
import { mergeRenderProps } from "./utils";

interface FileUploadListProps extends useRender.ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical";
  forceMount?: boolean;
}

function FileUploadList(props: FileUploadListProps) {
  const { className, orientation = "vertical", render, forceMount, ...listProps } = props;

  const context = useFileUploadContext(LIST_NAME);
  const fileCount = useFileUploadStore((state) => state.files.size);
  const shouldRender = forceMount || fileCount > 0;

  const listElement = useRender({
    defaultTagName: "div",
    render,
    props: mergeRenderProps<"div">(
      {
        role: "list",
        id: context.listId,
        "aria-orientation": orientation,
        "data-orientation": orientation,
        "data-slot": "file-upload-list",
        "data-state": shouldRender ? "active" : "inactive",
        className: cn(
          "flex flex-col gap-2 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=inactive]:slide-out-to-top-2",
          orientation === "horizontal" && "flex-row overflow-x-auto p-1.5",
          className,
        ),
      },
      listProps,
    ),
  });

  if (!shouldRender) return null;
  return listElement;
}

export { FileUploadList, type FileUploadListProps };
