let bundleReturnTo: string | null = null;
let bundleReturnScrollY: number | undefined;

function isBundleDetailPath(path: string): boolean {
  return /^\/bundles\/[^/]+/.test(path);
}

export function getBundleReturnTo(): string | null {
  return bundleReturnTo;
}

export function setBundleReturnTo(path: string): void {
  if (!isBundleDetailPath(path)) {
    bundleReturnTo = path;
    bundleReturnScrollY = window.scrollY;
  }
}

export function clearBundleReturnTo(): void {
  bundleReturnTo = null;
}

export function consumeReturnScrollY(): number | undefined {
  const v = bundleReturnScrollY;
  bundleReturnScrollY = undefined;
  return v;
}
