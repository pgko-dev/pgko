"use client";

import { useRender } from "@base-ui/react/use-render";
import * as React from "react";

import { TRIGGER_NAME, useFileUploadContext } from "./context";
import { mergeRenderProps } from "./utils";

type FileUploadTriggerProps = useRender.ComponentProps<"button">;

function FileUploadTrigger(props: FileUploadTriggerProps) {
  const { render, onClick: onClickProp, ...triggerProps } = props;
  const context = useFileUploadContext(TRIGGER_NAME);

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClickProp?.(event);

      if (event.defaultPrevented) return;

      context.inputRef.current?.click();
    },
    [context.inputRef, onClickProp],
  );

  return useRender({
    defaultTagName: "button",
    render,
    props: mergeRenderProps<"button">(
      {
        type: "button",
        "aria-controls": context.inputId,
        "data-disabled": context.disabled ? "" : undefined,
        "data-slot": "file-upload-trigger",
        disabled: context.disabled,
        onClick,
      },
      triggerProps,
    ),
  });
}

export { FileUploadTrigger, type FileUploadTriggerProps };
