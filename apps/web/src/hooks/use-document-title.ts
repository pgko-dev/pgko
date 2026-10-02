import { useLayoutEffect } from "react";

/** Sets `document.title` and restores the previous value on unmount or when `fullTitle` changes. */
export function useDocumentTitle(fullTitle: string) {
  useLayoutEffect(() => {
    const previous = document.title;
    document.title = fullTitle;
    return () => {
      document.title = previous;
    };
  }, [fullTitle]);
}
