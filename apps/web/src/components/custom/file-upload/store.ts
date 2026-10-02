interface FileState {
  file: File;
  progress: number;
  error?: unknown;
  status: "idle" | "uploading" | "processing" | "error" | "success";
}

interface StoreState {
  files: Map<File, FileState>;
  dragOver: boolean;
  invalid: boolean;
}

type StoreAction =
  | { type: "ADD_FILES"; files: File[] }
  | { type: "SET_FILES"; files: File[] }
  | { type: "SET_PROGRESS"; file: File; progress: number }
  | { type: "SET_SUCCESS"; file: File }
  | { type: "SET_ERROR"; file: File; error: unknown }
  | { type: "REMOVE_FILE"; file: File }
  | { type: "SET_DRAG_OVER"; dragOver: boolean }
  | { type: "SET_INVALID"; invalid: boolean }
  | { type: "CLEAR" };

function addFiles(files: Map<File, FileState>, additions: File[]): void {
  for (const file of additions) {
    files.set(file, { file, progress: 0, status: "idle" });
  }
}

function synchronizeFiles(files: Map<File, FileState>, replacements: File[]): void {
  const newFileSet = new Set(replacements);
  for (const existingFile of files.keys()) {
    if (!newFileSet.has(existingFile)) files.delete(existingFile);
  }

  for (const file of replacements) {
    if (!files.has(file)) addFiles(files, [file]);
  }
}

function notifyFilesChanged(
  files: Map<File, FileState>,
  onValueChange?: (files: File[]) => void,
): void {
  onValueChange?.(Array.from(files.values()).map((fileState) => fileState.file));
}

function updateFileState(
  files: Map<File, FileState>,
  file: File,
  updates: Partial<FileState>,
): void {
  const fileState = files.get(file);
  if (fileState) files.set(file, { ...fileState, ...updates });
}

function updateFileProgress(files: Map<File, FileState>, file: File, progress: number): void {
  const fileState = files.get(file);
  // Late progress must not revive an upload that already succeeded or failed.
  if (!fileState || fileState.status === "success" || fileState.status === "error") return;

  updateFileState(files, file, {
    progress,
    // Processing continues on the server after the bytes have transferred.
    status: progress >= 100 ? "processing" : "uploading",
  });
}

function revokeFileUrl(urlCache: WeakMap<File, string>, file: File): void {
  const cachedUrl = urlCache.get(file);
  if (cachedUrl) {
    URL.revokeObjectURL(cachedUrl);
    urlCache.delete(file);
  }
}

function storeReducer(
  state: StoreState,
  action: StoreAction,
  urlCache: WeakMap<File, string>,
  onValueChange?: (files: File[]) => void,
): StoreState {
  const { files } = state;

  switch (action.type) {
    case "ADD_FILES": {
      addFiles(files, action.files);
      notifyFilesChanged(files, onValueChange);
      return { ...state, files };
    }

    case "SET_FILES": {
      synchronizeFiles(files, action.files);
      return { ...state, files };
    }

    case "SET_PROGRESS": {
      updateFileProgress(files, action.file, action.progress);
      return { ...state, files };
    }

    case "SET_SUCCESS": {
      updateFileState(files, action.file, { progress: 100, status: "success" });
      return { ...state, files };
    }

    case "SET_ERROR": {
      updateFileState(files, action.file, { error: action.error, status: "error" });
      return { ...state, files };
    }

    case "REMOVE_FILE": {
      revokeFileUrl(urlCache, action.file);
      files.delete(action.file);
      notifyFilesChanged(files, onValueChange);
      return { ...state, files };
    }

    case "SET_DRAG_OVER": {
      return { ...state, dragOver: action.dragOver };
    }

    case "SET_INVALID": {
      return { ...state, invalid: action.invalid };
    }

    case "CLEAR": {
      for (const file of files.keys()) revokeFileUrl(urlCache, file);

      files.clear();
      onValueChange?.([]);
      return { ...state, files, invalid: false };
    }

    default:
      return state;
  }
}

export { type FileState, type StoreAction, storeReducer, type StoreState };
