import { ImagePlus, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BundleRules, UserRules } from "@pgko-dev/config";
import type { PrivateUser } from "@pgko-dev/schema";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageCropper } from "@/components/img-crop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/auth";
import { formatBytes } from "@/lib/format-bytes";
import { getInitials } from "@/lib/get-initials";
import { handleApiError } from "@/lib/parse-error";
import { cn } from "@/lib/utils";

export function AvatarSection({ user }: Readonly<{ user: PrivateUser }>) {
  const { t } = useTranslation();
  const { uploadAvatar, deleteAvatar } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    if (!UserRules.avatar.allowedMimeTypes.includes(file.type)) {
      toast.error(t("ui.fileUpload.error.typeNotAccepted"));
      return;
    }

    setCropFile(file);
    setCropOpen(true);
  };

  const handleCrop = useCallback(
    async (blob: Blob) => {
      const file = new File([blob], "avatar.png", { type: "image/png" });
      setCropFile(null);
      if (file.size > UserRules.avatar.maxFileBytes) {
        toast.error(
          t("ui.fileUpload.error.fileTooLarge", {
            size: formatBytes(UserRules.avatar.maxFileBytes),
          }),
        );
        return;
      }
      setIsUploading(true);
      try {
        await uploadAvatar(file);
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadAvatar, t],
  );

  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    setIsDeleting(true);
    try {
      await deleteAvatar();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const busy = isUploading || isDeleting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ui.settingsPage.avatarSection.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-row items-stretch gap-5">
        <input
          ref={inputRef}
          type="file"
          accept={UserRules.avatar.allowedMimeTypes.join(",")}
          onChange={handleFileChange}
          className="sr-only"
          aria-label={
            user.avatarUrl
              ? t("ui.settingsPage.avatarSection.change")
              : t("ui.settingsPage.avatarSection.upload")
          }
        />
        <div
          className={cn(
            "relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full",
            "border-2 border-border bg-muted",
            busy && "pointer-events-none",
          )}
        >
          <Avatar className="size-full rounded-full border-0 text-2xl ring-0" aria-hidden>
            <AvatarImage src={user.avatarUrl ?? undefined} alt="" className="object-cover" />
            <AvatarFallback className="bg-muted font-semibold text-foreground/90">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {busy && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-black/50 transition-opacity">
              <Spinner className="size-7 text-white" />
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex min-h-24 shrink-0 flex-col items-start",
            user.avatarUrl ? "justify-between" : "justify-end gap-3",
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="min-w-26 justify-center"
          >
            {isUploading ? <Spinner className="size-4" /> : <ImagePlus className="size-4" />}
            <span className="ml-2">
              {user.avatarUrl
                ? t("ui.settingsPage.avatarSection.change")
                : t("ui.settingsPage.avatarSection.upload")}
            </span>
          </Button>
          {user.avatarUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setDeleteDialogOpen(true)}
              className="min-w-26 justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {isDeleting ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
              <span className="ml-2">{t("ui.settingsPage.avatarSection.delete")}</span>
            </Button>
          )}
          <p className="text-xs whitespace-pre text-muted-foreground">
            {t("ui.settingsPage.avatarSection.hint", {
              size: formatBytes(BundleRules.cover.maxFileBytes),
            })}
          </p>
        </div>
      </CardContent>

      <ImageCropper
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open) setCropFile(null);
        }}
        file={cropFile}
        aspect={1}
        circularCrop
        maxPixelSize={UserRules.avatar.maxPixelSize * 2}
        onCrop={handleCrop}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleteDialogOpen(open);
        }}
        description={t("ui.settingsPage.avatarSection.deleteConfirm")}
        tone="destructive"
        cancelLabel={t("ui.uploadDetail.actions.cancel")}
        confirmContent={
          <>
            {isDeleting ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
            <span className="ml-2">{t("ui.settingsPage.avatarSection.delete")}</span>
          </>
        }
        isBusy={isDeleting}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
