import { describe, expect, mock, spyOn, test } from "bun:test";

import { storeReducer, type StoreState } from "./store";

function initialState(): StoreState {
  return { files: new Map(), dragOver: false, invalid: false };
}

describe("file upload state", () => {
  test("keeps terminal uploads unchanged when late progress events arrive", () => {
    const uploaded = new File(["bundle"], "uploaded.zip");
    const failed = new File(["bundle"], "failed.zip");
    const urlCache = new WeakMap<File, string>();
    let state = storeReducer(
      initialState(),
      { type: "ADD_FILES", files: [uploaded, failed] },
      urlCache,
    );

    state = storeReducer(state, { type: "SET_PROGRESS", file: uploaded, progress: 100 }, urlCache);
    expect(state.files.get(uploaded)?.status).toBe("processing");

    state = storeReducer(state, { type: "SET_SUCCESS", file: uploaded }, urlCache);
    state = storeReducer(
      state,
      { type: "SET_ERROR", file: failed, error: "upload failed" },
      urlCache,
    );
    state = storeReducer(state, { type: "SET_PROGRESS", file: uploaded, progress: 10 }, urlCache);
    state = storeReducer(state, { type: "SET_PROGRESS", file: failed, progress: 100 }, urlCache);

    expect(state.files.get(uploaded)).toMatchObject({ progress: 100, status: "success" });
    expect(state.files.get(failed)).toMatchObject({ error: "upload failed", status: "error" });
  });

  test("preserves upload state during a controlled file list update", () => {
    const retained = new File(["bundle"], "retained.zip");
    const removed = new File(["bundle"], "removed.zip");
    const added = new File(["bundle"], "added.zip");
    const urlCache = new WeakMap<File, string>();
    const onValueChange = mock();
    let state = storeReducer(
      initialState(),
      { type: "ADD_FILES", files: [retained, removed] },
      urlCache,
    );
    state = storeReducer(state, { type: "SET_PROGRESS", file: retained, progress: 42 }, urlCache);
    state = storeReducer(
      state,
      { type: "SET_FILES", files: [retained, added] },
      urlCache,
      onValueChange,
    );

    expect([...state.files.keys()]).toEqual([retained, added]);
    expect(state.files.get(retained)).toMatchObject({ progress: 42, status: "uploading" });
    expect(state.files.get(added)).toMatchObject({ progress: 0, status: "idle" });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("releases preview URLs and notifies after removal and clearing", () => {
    const first = new File(["image"], "first.png");
    const second = new File(["image"], "second.png");
    const urlCache = new WeakMap<File, string>([
      [first, "blob:first"],
      [second, "blob:second"],
    ]);
    const onValueChange = mock();
    const revokeObjectURL = spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    try {
      let state = storeReducer(
        initialState(),
        { type: "ADD_FILES", files: [first, second] },
        urlCache,
      );
      state = storeReducer(state, { type: "REMOVE_FILE", file: first }, urlCache, onValueChange);
      expect(onValueChange).toHaveBeenLastCalledWith([second]);
      expect(urlCache.has(first)).toBe(false);

      state = storeReducer({ ...state, invalid: true }, { type: "CLEAR" }, urlCache, onValueChange);
      expect(state.files.size).toBe(0);
      expect(state.invalid).toBe(false);
      expect(urlCache.has(second)).toBe(false);
      expect(onValueChange).toHaveBeenLastCalledWith([]);
      expect(revokeObjectURL.mock.calls).toEqual([["blob:first"], ["blob:second"]]);
    } finally {
      revokeObjectURL.mockRestore();
    }
  });
});
