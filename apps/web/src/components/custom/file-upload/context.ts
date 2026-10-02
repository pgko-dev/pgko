import { type Atom, useSelector } from "@tanstack/react-store";
import * as React from "react";

import type { FileState, StoreAction, StoreState } from "./store";

const ROOT_NAME = "FileUpload";
const DROPZONE_NAME = "FileUploadDropzone";
const TRIGGER_NAME = "FileUploadTrigger";
const LIST_NAME = "FileUploadList";
const ITEM_NAME = "FileUploadItem";
const ITEM_PREVIEW_NAME = "FileUploadItemPreview";
const ITEM_METADATA_NAME = "FileUploadItemMetadata";
const ITEM_PROGRESS_NAME = "FileUploadItemProgress";
interface FileUploadContextValue {
  store: Atom<StoreState>;
  dispatch: (action: StoreAction) => void;
  inputId: string;
  dropzoneId: string;
  listId: string;
  labelId: string;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  urlCache: WeakMap<File, string>;
  onFilesChange: (files: File[]) => void;
}

const FileUploadContext = React.createContext<FileUploadContextValue | null>(null);

function useFileUploadContext(consumerName: string) {
  const context = React.use(FileUploadContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

function useFileUploadStore<T>(selector: (state: StoreState) => T): T {
  const { store } = useFileUploadContext("useFileUploadStore");
  return useSelector(store, selector);
}

interface FileUploadItemContextValue {
  id: string;
  fileState: FileState | undefined;
  nameId: string;
  sizeId: string;
  statusId: string;
  messageId: string;
}

const FileUploadItemContext = React.createContext<FileUploadItemContextValue | null>(null);

function useFileUploadItemContext(consumerName: string) {
  const context = React.use(FileUploadItemContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``);
  }
  return context;
}

export {
  DROPZONE_NAME,
  FileUploadContext,
  type FileUploadContextValue,
  FileUploadItemContext,
  type FileUploadItemContextValue,
  ITEM_METADATA_NAME,
  ITEM_NAME,
  ITEM_PREVIEW_NAME,
  ITEM_PROGRESS_NAME,
  LIST_NAME,
  ROOT_NAME,
  TRIGGER_NAME,
  useFileUploadContext,
  useFileUploadItemContext,
  useFileUploadStore,
};
