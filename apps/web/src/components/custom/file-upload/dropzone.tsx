"use client";

import { useRender } from "@base-ui/react/use-render";
import * as React from "react";

import { cn } from "@/lib/utils";

import { DROPZONE_NAME, useFileUploadContext, useFileUploadStore } from "./context";
import { mergeRenderProps } from "./utils";

type FileUploadDropzoneProps = useRender.ComponentProps<"div">;

function FileUploadDropzone(props: FileUploadDropzoneProps) {
  const {
    render,
    className,
    onClick: onClickProp,
    onDragOver: onDragOverProp,
    onDragEnter: onDragEnterProp,
    onDragLeave: onDragLeaveProp,
    onDrop: onDropProp,
    onPaste: onPasteProp,
    onKeyDown: onKeyDownProp,
    ...dropzoneProps
  } = props;

  const context = useFileUploadContext(DROPZONE_NAME);
  const { dispatch, onFilesChange } = context;
  const dragOver = useFileUploadStore((state) => state.dragOver);
  const invalid = useFileUploadStore((state) => state.invalid);

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      onClickProp?.(event);

      if (event.defaultPrevented) return;

      const target = event.target;

      const isFromTrigger =
        target instanceof HTMLElement && target.closest('[data-slot="file-upload-trigger"]');

      if (!isFromTrigger) {
        context.inputRef.current?.click();
      }
    },
    [context.inputRef, onClickProp],
  );

  const onDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragOverProp?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      dispatch({ type: "SET_DRAG_OVER", dragOver: true });
    },
    [dispatch, onDragOverProp],
  );

  const onDragEnter = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragEnterProp?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      dispatch({ type: "SET_DRAG_OVER", dragOver: true });
    },
    [dispatch, onDragEnterProp],
  );

  const onDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragLeaveProp?.(event);

      if (event.defaultPrevented) return;

      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget &&
        relatedTarget instanceof Node &&
        event.currentTarget.contains(relatedTarget)
      ) {
        return;
      }

      event.preventDefault();
      dispatch({ type: "SET_DRAG_OVER", dragOver: false });
    },
    [dispatch, onDragLeaveProp],
  );

  const onDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDropProp?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      dispatch({ type: "SET_DRAG_OVER", dragOver: false });
      onFilesChange(Array.from(event.dataTransfer.files));
    },
    [dispatch, onFilesChange, onDropProp],
  );

  const onPaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      onPasteProp?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      dispatch({ type: "SET_DRAG_OVER", dragOver: false });

      const items = event.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item?.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length === 0) return;

      onFilesChange(files);
    },
    [dispatch, onFilesChange, onPasteProp],
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDownProp?.(event);

      if (!event.defaultPrevented && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        context.inputRef.current?.click();
      }
    },
    [context.inputRef, onKeyDownProp],
  );

  return useRender({
    defaultTagName: "div",
    render,
    props: mergeRenderProps<"div">(
      {
        role: "region",
        id: context.dropzoneId,
        "aria-controls": `${context.inputId} ${context.listId}`,
        "aria-disabled": context.disabled,
        "aria-invalid": invalid,
        "data-disabled": context.disabled ? "" : undefined,
        "data-dragging": dragOver ? "" : undefined,
        "data-invalid": invalid ? "" : undefined,
        "data-slot": "file-upload-dropzone",
        tabIndex: context.disabled ? undefined : 0,
        className: cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors outline-none select-none hover:bg-accent/30 focus-visible:border-ring/50 data-[disabled]:pointer-events-none data-[dragging]:border-primary/30 data-[dragging]:bg-accent/30 data-[invalid]:border-destructive data-[invalid]:ring-destructive/20",
          className,
        ),
        onClick,
        onDragEnter,
        onDragLeave,
        onDragOver,
        onDrop,
        onKeyDown,
        onPaste,
      },
      dropzoneProps,
    ),
  });
}

export { FileUploadDropzone, type FileUploadDropzoneProps };
