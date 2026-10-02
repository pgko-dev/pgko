const BUNDLE_FILE_ALLOWED_MIME_TYPES = ["application/x-zip-compressed", "application/zip"] as const;

const BUNDLE_FILE_ALLOWED_EXTENSIONS = [".zip"] as const;

export function hasAcceptedBundleFileExtension(fileName: string | null | undefined): boolean {
  const normalizedName = (fileName ?? "").toLowerCase();
  return BUNDLE_FILE_ALLOWED_EXTENSIONS.some((extension) => normalizedName.endsWith(extension));
}

export function hasAcceptedBundleFileMimeType(mimeType: string | null | undefined): boolean {
  return BUNDLE_FILE_ALLOWED_MIME_TYPES.includes((mimeType ?? "").toLowerCase() as never);
}

export function isAcceptedBundleFileType(
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
): boolean {
  return hasAcceptedBundleFileExtension(fileName) || hasAcceptedBundleFileMimeType(mimeType);
}

export const BundleRules = {
  preview: {
    maxDurationSec: 20,
  },
  file: {
    maxFileBytes: 150 * 1024 * 1024,
    maxExtractedBytes: 500 * 1024 * 1024,
    allowedMimeTypes: [...BUNDLE_FILE_ALLOWED_MIME_TYPES] as string[],
    allowedExtensions: [...BUNDLE_FILE_ALLOWED_EXTENSIONS] as string[],
    accept: [...BUNDLE_FILE_ALLOWED_MIME_TYPES, ...BUNDLE_FILE_ALLOWED_EXTENSIONS] as string[],
  },
  cover: {
    maxFileBytes: 10 * 1024 * 1024,
    maxPixelSize: 300,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] as string[],
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
  },
  title: {
    minLength: 1,
    maxLength: 256,
  },
  artist: {
    minLength: 1,
    maxLength: 256,
  },
  description: {
    minLength: 0,
    maxLength: 1024,
  },
  tags: {
    maxLength: 8,
  },
  tag: {
    minLength: 3,
    maxLength: 18,
    autoCapitalize: "off",
    /** Lowercase letters, numbers, spaces only (trimmed before validation). */
    pattern: /^[a-z0-9\s]*$/,
  },
  collaborators: {
    maxCount: 100,
  },
  videoUrl: {
    minLength: 0,
    maxLength: 2048,
    type: "url",
    inputMode: "url",
    placeholder: "https://â€¦",
  },
} as const;
