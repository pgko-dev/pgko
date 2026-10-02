"use client";

import { useRender } from "@base-ui/react/use-render";

import {
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { formatBytes } from "@/lib/format-bytes";
import { cn } from "@/lib/utils";

import { ITEM_METADATA_NAME, useFileUploadItemContext } from "./context";
import { mergeRenderProps } from "./utils";

interface FileUploadItemMetadataProps extends useRender.ComponentProps<"div"> {
  size?: "default" | "sm";
}

function FileUploadItemMetadata(props: Readonly<FileUploadItemMetadataProps>) {
  const { render, size = "default", children, className, ...metadataProps } = props;

  const itemContext = useFileUploadItemContext(ITEM_METADATA_NAME);

  const metadataChildren =
    children ??
    (itemContext.fileState ? (
      <>
        <AttachmentTitle
          id={itemContext.nameId}
          className={cn(size === "sm" && "text-[13px] leading-snug font-normal")}
        >
          {itemContext.fileState.file.name}
        </AttachmentTitle>
        <AttachmentDescription
          id={itemContext.sizeId}
          className={cn(size === "sm" && "text-[11px] leading-snug")}
        >
          {formatBytes(itemContext.fileState.file.size)}
        </AttachmentDescription>
      </>
    ) : null);

  const customMetadataElement = useRender({
    defaultTagName: "div",
    render,
    props: mergeRenderProps<"div">(
      {
        "data-slot": "file-upload-metadata",
        className: cn("flex min-w-0 flex-1 flex-col", className),
        children: metadataChildren,
      },
      metadataProps,
    ),
  });

  if (!itemContext.fileState) return null;
  if (render) return customMetadataElement;

  return (
    <AttachmentContent {...metadataProps} className={className}>
      {metadataChildren}
    </AttachmentContent>
  );
}

export { FileUploadItemMetadata, type FileUploadItemMetadataProps };
