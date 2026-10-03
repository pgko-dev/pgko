import { FileIcon, Loader2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BundleRules } from "@pgko.dev/config";

import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
  type FileUploadProps,
} from "@/components/custom/file-upload";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format-bytes";

type BundleArchiveUploadProps = Pick<
  FileUploadProps,
  "onValueChange" | "onFileReject" | "onUpload"
> & {
  files: File[];
  isUploading: boolean;
};

function renderUploadingPreview() {
  return <Loader2 className="animate-spin" />;
}

function renderArchivePreview() {
  return <FileIcon />;
}

export function BundleArchiveUpload({
  files,
  isUploading,
  onValueChange,
  onFileReject,
  onUpload,
}: Readonly<BundleArchiveUploadProps>) {
  const { t } = useTranslation();

  return (
    <FileUpload
      disabled={isUploading}
      value={files}
      onValueChange={onValueChange}
      onFileReject={onFileReject}
      maxSize={BundleRules.file.maxFileBytes}
      accept={BundleRules.file.accept.join(",")}
      maxFiles={1}
      multiple={false}
      className="w-full"
      clearOnChange={true}
      onUpload={onUpload}
    >
      <FileUploadDropzone className="gap-0">
        <div className="flex flex-col items-center">
          <div className="mb-1 flex items-center justify-center rounded-full border p-2.5">
            <Upload className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium">
              {t("ui.fileUpload.hint.dropHint", { extensions: "ZIP" })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("ui.fileUpload.hint.condition", {
                size: formatBytes(BundleRules.file.maxFileBytes),
              })}
            </p>
          </div>
          <FileUploadTrigger
            render={
              <Button variant="outline" size="sm" className="mt-2 w-fit">
                {t("ui.fileUpload.hint.browseFiles")}
              </Button>
            }
          />
        </div>
      </FileUploadDropzone>
      <FileUploadList>
        {files.map((file) => (
          <FileUploadItem key={`${file.name}-${file.size}-${file.lastModified}`} value={file}>
            <FileUploadItemPreview
              previewContent={isUploading ? renderUploadingPreview : renderArchivePreview}
            />
            <FileUploadItemMetadata />
            <FileUploadItemProgress />
          </FileUploadItem>
        ))}
      </FileUploadList>
    </FileUpload>
  );
}
