"use client";

import { createAtom } from "@tanstack/react-store";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { formatBytes } from "@/lib/format-bytes";

import { type FileUploadContextValue } from "./context";
import type { FileUploadRootProps } from "./root";
import { type FileState, type StoreAction, storeReducer, type StoreState } from "./store";
import { useLazyRef } from "./utils";

type FileValidationOptions = Pick<
  FileUploadRootProps,
  "onFileValidate" | "onFileReject" | "maxSize"
> & {
  acceptTypes: string[] | null;
  t: ReturnType<typeof useTranslation>["t"];
};

function matchesAcceptedType(file: File, acceptTypes: string[]): boolean {
  const fileType = file.type;
  const fileExtension = `.${file.name.split(".").pop()}`;

  return acceptTypes.some(
    (type) =>
      type === fileType ||
      type === fileExtension ||
      (type.includes("/*") && fileType.startsWith(type.replace("/*", "/"))),
  );
}

function validateFile(file: File, options: FileValidationOptions): boolean {
  const { onFileValidate, onFileReject, maxSize, acceptTypes, t } = options;
  const validationMessage = onFileValidate?.(file);
  if (validationMessage) {
    onFileReject?.([file], validationMessage);
    return false;
  }

  let valid = true;
  if (acceptTypes && !matchesAcceptedType(file, acceptTypes)) {
    onFileReject?.([file], t("ui.fileUpload.error.typeNotAccepted"));
    valid = false;
  }

  if (maxSize && file.size > maxSize) {
    onFileReject?.([file], t("ui.fileUpload.error.fileTooLarge", { size: formatBytes(maxSize) }));
    valid = false;
  }

  return valid;
}

function validateFiles(files: File[], options: FileValidationOptions) {
  const acceptedFiles: File[] = [];
  let invalid = false;
  for (const file of files) {
    if (validateFile(file, options)) {
      acceptedFiles.push(file);
    } else {
      invalid = true;
    }
  }

  return { acceptedFiles, invalid };
}

export function useFileUploadRoot(props: FileUploadRootProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    onAccept,
    onFileAccept,
    onFileReject,
    onFileValidate,
    onUpload,
    accept,
    maxFiles,
    maxSize,
    label,
    name,
    render,
    clearOnChange = false,
    disabled = false,
    invalid = false,
    multiple = false,
    required = false,
    children,
    className,
    ...rootProps
  } = props;

  const inputId = React.useId();
  const dropzoneId = React.useId();
  const listId = React.useId();
  const labelId = React.useId();

  const files = useLazyRef<Map<File, FileState>>(() => new Map()).current;
  const urlCache = useLazyRef(() => new WeakMap<File, string>()).current;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isControlled = value !== undefined;

  const store = useLazyRef(() =>
    createAtom<StoreState>({
      files,
      dragOver: false,
      invalid,
    }),
  ).current;

  const dispatch = React.useCallback(
    (action: StoreAction) => {
      store.set((prev) => storeReducer(prev, action, urlCache, onValueChange));
    },
    [store, urlCache, onValueChange],
  );

  const { t } = useTranslation();

  const acceptTypes = React.useMemo(
    () => accept?.split(",").map((t) => t.trim()) ?? null,
    [accept],
  );

  const onProgress = useLazyRef(() => {
    let frame = 0;
    return (file: File, progress: number) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        dispatch({
          type: "SET_PROGRESS",
          file,
          progress: Math.min(Math.max(0, progress), 100),
        });
      });
    };
  }).current;

  React.useEffect(() => {
    if (isControlled) {
      dispatch({ type: "SET_FILES", files: value });
    } else if (defaultValue && defaultValue.length > 0 && !store.get().files.size) {
      dispatch({ type: "SET_FILES", files: defaultValue });
    }
  }, [value, defaultValue, isControlled, store, dispatch]);

  React.useEffect(() => {
    return () => {
      for (const file of files.keys()) {
        const cachedUrl = urlCache.get(file);
        if (cachedUrl) {
          URL.revokeObjectURL(cachedUrl);
        }
      }
    };
  }, [files, urlCache]);

  const onFilesUpload = React.useCallback(
    async (files: File[]) => {
      try {
        for (const file of files) {
          dispatch({ type: "SET_PROGRESS", file, progress: 0 });
        }

        if (onUpload) {
          await onUpload(files, {
            onProgress,
            onSuccess: (file) => {
              dispatch({ type: "SET_SUCCESS", file });
            },
            onError: (file, error) => {
              dispatch({
                type: "SET_ERROR",
                file,
                error,
              });
            },
          });
        } else {
          for (const file of files) {
            dispatch({ type: "SET_SUCCESS", file });
          }
        }
      } catch (error) {
        for (const file of files) {
          dispatch({
            type: "SET_ERROR",
            file,
            error,
          });
        }
      }
    },
    [dispatch, onUpload, onProgress],
  );

  const onFilesChange = React.useCallback(
    (originalFiles: File[]) => {
      if (disabled) return;

      if (clearOnChange) {
        const hasError = Array.from(store.get().files.values()).some((s) => s.status === "error");
        if (hasError) {
          dispatch({ type: "CLEAR" });
        }
      }

      let filesToProcess = [...originalFiles];
      let invalid = false;

      if (maxFiles) {
        const currentCount = store.get().files.size;
        const remainingSlotCount = Math.max(0, maxFiles - currentCount);

        if (filesToProcess.length > remainingSlotCount) {
          invalid = true;
          onFileReject?.(filesToProcess, t("ui.fileUpload.error.maxFiles", { count: maxFiles }));
          filesToProcess = [];
        }
      }

      const validation = validateFiles(filesToProcess, {
        onFileValidate,
        onFileReject,
        acceptTypes,
        maxSize,
        t,
      });
      const { acceptedFiles } = validation;
      invalid ||= validation.invalid;

      if (invalid) {
        dispatch({ type: "SET_INVALID", invalid });
        setTimeout(() => {
          dispatch({ type: "SET_INVALID", invalid: false });
        }, 2000);
      }

      if (acceptedFiles.length === 0) return;

      dispatch({ type: "ADD_FILES", files: acceptedFiles });

      if (isControlled && onValueChange) {
        const currentFiles = Array.from(store.get().files.values()).map((f) => f.file);
        onValueChange([...currentFiles]);
      }

      onAccept?.(acceptedFiles);

      for (const file of acceptedFiles) {
        onFileAccept?.(file);
      }

      if (onUpload) {
        requestAnimationFrame(() => {
          onFilesUpload(acceptedFiles).catch(console.error);
        });
      }
    },
    [
      store,
      dispatch,
      isControlled,
      onValueChange,
      onAccept,
      onFileAccept,
      onUpload,
      onFilesUpload,
      maxFiles,
      onFileValidate,
      onFileReject,
      acceptTypes,
      maxSize,
      disabled,
      t,
      clearOnChange,
    ],
  );

  const onInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      onFilesChange(files);
      event.target.value = "";
    },
    [onFilesChange],
  );

  const storeContextValue = React.useMemo<FileUploadContextValue>(
    () => ({
      store,
      dispatch,
      dropzoneId,
      inputId,
      listId,
      labelId,
      disabled,
      inputRef,
      urlCache,
      onFilesChange,
    }),
    [store, dispatch, dropzoneId, inputId, listId, labelId, disabled, urlCache, onFilesChange],
  );

  return {
    storeContextValue,
    onInputChange,
    inputRef,
    inputId,
    dropzoneId,
    labelId,
    disabled,
    invalid,
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
  };
}
