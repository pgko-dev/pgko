import { mergeProps } from "@base-ui/react/merge-props";
import type { useRender } from "@base-ui/react/use-render";
import * as React from "react";

type FileUploadState = "idle" | "uploading" | "processing" | "error" | "success";

type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";

function toAttachmentState(state: FileUploadState): AttachmentState {
  return state === "success" ? "done" : state;
}

function useLazyRef<T>(fn: () => T) {
  const [ref] = React.useState(() => ({ current: fn() }));
  return ref as React.RefObject<T>;
}

/**
 * Merges component-owned props with the caller's forwarded props for `useRender`.
 * Centralizes the cast required to pass an arbitrary attribute bag to `mergeProps`.
 */
function mergeRenderProps<Tag extends React.ElementType>(
  ownProps: Record<string, unknown>,
  forwardedProps: object | undefined,
) {
  return mergeProps<Tag>(
    ownProps as useRender.ElementProps<Tag>,
    forwardedProps as useRender.ElementProps<Tag>,
  );
}

export { mergeRenderProps, useLazyRef, toAttachmentState };
