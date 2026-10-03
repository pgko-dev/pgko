import { BundleRules, isAcceptedBundleFileType } from "@pgko.dev/config";
import type { TranslationKey } from "@pgko.dev/i18n";

export type BundleValidationResult = { valid: true } | { valid: false; messageKey: TranslationKey };

const MAX_FILE_BYTES = BundleRules.file.maxFileBytes;

export function validateBundleFile(file: File): BundleValidationResult {
  if (file.size > MAX_FILE_BYTES) {
    return { valid: false, messageKey: "ui.fileUpload.error.fileTooLarge" };
  }

  if (!isAcceptedBundleFileType(file.name, file.type)) {
    return { valid: false, messageKey: "ui.fileUpload.error.typeNotAccepted" };
  }

  return { valid: true };
}
