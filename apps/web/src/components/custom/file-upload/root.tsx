"use client";

import { useRender } from "@base-ui/react/use-render";

import { cn } from "@/lib/utils";

import { FileUploadContext } from "./context";
import { useFileUploadRoot } from "./use-file-upload-root";
import { mergeRenderProps } from "./utils";

interface FileUploadRootProps extends Omit<
  useRender.ComponentProps<"div">,
  "defaultValue" | "onChange"
> {
  value?: File[];
  defaultValue?: File[];
  onValueChange?: (files: File[]) => void;
  onAccept?: (files: File[]) => void;
  onFileAccept?: (file: File) => void;
  onFileReject?: (files: File[], message: string) => void;
  onFileValidate?: (file: File) => string | null | undefined;
  onUpload?: (
    files: File[],
    options: {
      onProgress: (file: File, progress: number) => void;
      onSuccess: (file: File) => void;
      onError: (file: File, error: unknown) => void;
    },
  ) => Promise<void> | void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  label?: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  multiple?: boolean;
  required?: boolean;
  clearOnChange?: boolean;
}

function FileUploadRoot(props: Readonly<FileUploadRootProps>) {
  const {
    storeContextValue,
    onInputChange,
    inputRef,
    inputId,
    dropzoneId,
    labelId,
    disabled,
    multiple,
    required,
    accept,
    name,
    label,
    t,
    render,
    children,
    className,
    rootProps,
  } = useFileUploadRoot(props);

  const rootElement = useRender({
    defaultTagName: "div",
    render,
    props: mergeRenderProps<"div">(
      {
        "data-disabled": disabled ? "" : undefined,
        "data-slot": "file-upload",
        className: cn("relative flex flex-col gap-2", className),
        children: (
          <>
            {children}
            <input
              type="file"
              id={inputId}
              aria-labelledby={labelId}
              aria-describedby={dropzoneId}
              ref={inputRef}
              tabIndex={-1}
              accept={accept}
              name={name}
              className="sr-only"
              disabled={disabled}
              multiple={multiple}
              required={required}
              onChange={onInputChange}
            />
            <span id={labelId} className="sr-only">
              {label ?? t("ui.fileUpload.label")}
            </span>
          </>
        ),
      },
      rootProps,
    ),
  });

  return <FileUploadContext value={storeContextValue}>{rootElement}</FileUploadContext>;
}

export { FileUploadRoot, type FileUploadRootProps };
