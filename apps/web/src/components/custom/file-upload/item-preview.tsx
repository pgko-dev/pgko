"use client";

import { useRender } from "@base-ui/react/use-render";
import {
  FileArchiveIcon,
  FileAudioIcon,
  FileCodeIcon,
  FileCogIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
} from "lucide-react";
import * as React from "react";

import { RemoteImage } from "@/components/remote-image";
import { AttachmentMedia } from "@/components/ui/attachment";
import { cn } from "@/lib/utils";

import { ITEM_PREVIEW_NAME, useFileUploadContext, useFileUploadItemContext } from "./context";
import { mergeRenderProps } from "./utils";

const TEXT_EXTENSIONS = new Set(["txt", "md", "rtf", "pdf"]);
const CODE_EXTENSIONS = new Set([
  "html",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "xml",
  "php",
  "py",
  "rb",
  "java",
  "c",
  "cpp",
  "cs",
]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz", "bz2"]);
const EXECUTABLE_EXTENSIONS = new Set(["exe", "msi", "app", "apk", "deb", "rpm"]);

function getFileIcon(file: File) {
  const type = file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (type.startsWith("video/")) {
    return <FileVideoIcon />;
  }

  if (type.startsWith("audio/")) {
    return <FileAudioIcon />;
  }

  if (type.startsWith("text/") || TEXT_EXTENSIONS.has(extension)) {
    return <FileTextIcon />;
  }

  if (CODE_EXTENSIONS.has(extension)) {
    return <FileCodeIcon />;
  }

  if (ARCHIVE_EXTENSIONS.has(extension)) {
    return <FileArchiveIcon />;
  }

  if (EXECUTABLE_EXTENSIONS.has(extension) || type.startsWith("application/")) {
    return <FileCogIcon />;
  }

  return <FileIcon />;
}

interface FileUploadItemPreviewProps extends useRender.ComponentProps<"div"> {
  previewContent?: (file: File, fallback: () => React.ReactNode) => React.ReactNode;
}

function FileUploadItemPreview(props: Readonly<FileUploadItemPreviewProps>) {
  const { previewContent, render, children, className, ...previewProps } = props;

  const itemContext = useFileUploadItemContext(ITEM_PREVIEW_NAME);
  const context = useFileUploadContext(ITEM_PREVIEW_NAME);
  const file = itemContext.fileState?.file;
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file?.type.startsWith("image/")) {
      setImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    context.urlCache.set(file, url);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
      context.urlCache.delete(file);
    };
  }, [file, context.urlCache]);

  const getDefaultRender = React.useCallback(
    (previewFile: File) => {
      if (previewFile.type.startsWith("image/") && imageUrl) {
        return (
          <RemoteImage
            src={imageUrl}
            alt={previewFile.name}
            className="absolute inset-0"
            fallbackIconClassName="size-6 text-muted-foreground"
          />
        );
      }

      return getFileIcon(previewFile);
    },
    [imageUrl],
  );

  const onPreviewRender = React.useCallback(
    (file: File) => {
      if (previewContent) {
        return previewContent(file, () => getDefaultRender(file));
      }

      return getDefaultRender(file);
    },
    [previewContent, getDefaultRender],
  );

  const previewChildren = (
    <>
      {itemContext.fileState ? onPreviewRender(itemContext.fileState.file) : null}
      {children}
    </>
  );

  const customPreviewElement = useRender({
    defaultTagName: "div",
    render,
    props: mergeRenderProps<"div">(
      {
        "aria-labelledby": itemContext.nameId,
        "data-slot": "file-upload-preview",
        className: cn(
          "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-accent/50 [&>svg]:size-10",
          className,
        ),
        children: previewChildren,
      },
      previewProps,
    ),
  });

  if (!itemContext.fileState) return null;
  if (render) return customPreviewElement;

  return (
    <AttachmentMedia
      {...previewProps}
      aria-labelledby={itemContext.nameId}
      variant={itemContext.fileState.file.type.startsWith("image/") ? "image" : "icon"}
      className={className}
    >
      {previewChildren}
    </AttachmentMedia>
  );
}

export { FileUploadItemPreview, type FileUploadItemPreviewProps };
