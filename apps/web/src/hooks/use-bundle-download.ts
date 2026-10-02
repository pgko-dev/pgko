import { getBundleDownloadUrl } from "@/lib/api.ts";

export function useBundleDownload(bundleId: string) {
  const downloadUrl = getBundleDownloadUrl(bundleId);
  return { downloadUrl };
}
