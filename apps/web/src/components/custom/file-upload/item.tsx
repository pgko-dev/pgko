"use client";

import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Attachment } from "@/components/ui/attachment";
import { cn } from "@/lib/utils";

import { FileUploadItemContext, useFileUploadStore } from "./context";
import { mergeRenderProps, toAttachmentState } from "./utils";

interface FileUploadItemProps extends useRender.ComponentProps<"div"> {
  value: File;
}

function FileUploadItem(props: Readonly<FileUploadItemProps>) {
  const { value, render, className, ...itemProps } = props;

  const id = React.useId();
  const statusId = `${id}-status`;
  const nameId = `${id}-name`;
  const sizeId = `${id}-size`;
  const messageId = `${id}-message`;

  const fileState = useFileUploadStore((state) => state.files.get(value));
  const fileCount = useFileUploadStore((state) => state.files.size);
  const fileIndex = useFileUploadStore((state) => {
    const files = Array.from(state.files.keys());
    return files.indexOf(value) + 1;
  });
  const { t } = useTranslation();

  const itemContext = React.useMemo(
    () => ({
      id,
      fileState,
      nameId,
      sizeId,
      statusId,
      messageId,
    }),
    [id, fileState, statusId, nameId, sizeId, messageId],
  );

  let statusText = "";
  if (fileState) {
    if (fileState.error) {
      statusText = t("ui.fileUpload.error.errorWithMessage", { message: fileState.error });
    } else if (fileState.status === "uploading") {
      statusText = t("ui.fileUpload.status.uploadingProgress", { progress: fileState.progress });
    } else if (fileState.status === "processing") {
      statusText = t("ui.fileUpload.status.processing");
    } else if (fileState.status === "success") {
      statusText = t("ui.fileUpload.status.uploadComplete");
    } else {
      statusText = t("ui.fileUpload.status.ready");
    }
  }

  const itemChildren = (
    <>
      {props.children}
      <span id={statusId} className="sr-only">
        {statusText}
      </span>
    </>
  );

  const customItemElement = useRender({
    defaultTagName: "div",
    render,
    props: mergeRenderProps<"div">(
      {
        role: "listitem",
        id,
        "aria-setsize": fileCount,
        "aria-posinset": fileIndex,
        "aria-describedby": `${nameId} ${sizeId} ${statusId} ${fileState?.error ? messageId : ""}`,
        "aria-labelledby": nameId,
        "data-slot": "file-upload-item",
        className: cn("relative flex items-center gap-2.5 rounded-md border p-3", className),
        children: itemChildren,
      },
      itemProps,
    ),
  });

  if (!fileState) return null;

  const itemElement = render ? (
    customItemElement
  ) : (
    <Attachment
      {...itemProps}
      role="listitem"
      id={id}
      aria-setsize={fileCount}
      aria-posinset={fileIndex}
      aria-describedby={`${nameId} ${sizeId} ${statusId} ${fileState.error ? messageId : ""}`}
      aria-labelledby={nameId}
      state={toAttachmentState(fileState.status)}
      className={cn("w-full", className)}
    >
      {itemChildren}
    </Attachment>
  );

  return <FileUploadItemContext value={itemContext}>{itemElement}</FileUploadItemContext>;
}

export { FileUploadItem, type FileUploadItemProps };
