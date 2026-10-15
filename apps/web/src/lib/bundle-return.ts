let bundleReturnTo: string | null = null;
let bundleReturnScroll: { href: string; scrollY: number } | undefined;

function isBundleDetailPath(path: string): boolean {
  return /^\/bundles\/[^/]+/.test(path);
}

export function getBundleReturnTo(): string | null {
  return bundleReturnTo;
}

export function setBundleReturnTo(path: string): void {
  if (!isBundleDetailPath(path)) {
    bundleReturnTo = path;
    bundleReturnScroll = { href: path, scrollY: window.scrollY };
  }
}

export function clearBundleReturnTo(): void {
  bundleReturnTo = null;
}

export function getBundleReturnScrollY(href: string): number | undefined {
  return bundleReturnScroll?.href === href ? bundleReturnScroll.scrollY : undefined;
}

export function clearBundleReturnScroll(): void {
  bundleReturnScroll = undefined;
}
