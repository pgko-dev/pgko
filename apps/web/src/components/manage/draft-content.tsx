import { DoorOpen, Loader2, Shredder, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Site } from "@/components/site";

import { ManageHeader } from "./manage-header";
import { ManageLoading } from "./manage-loading";
import { ManageMetadataTab } from "./manage-metadata-tab";
import { useBundleManageContext } from "./use-bundle-manage";

export function DraftContent() {
  const { t } = useTranslation();
  const manage = useBundleManageContext();
  const DeleteIcon = manage.deleteDialogMode === "delete" ? Trash2 : Shredder;

  if (manage.isLoading || !manage.data) {
    return <ManageLoading />;
  }

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await manage.form.handleSubmit();
  };

  const displayTitle = manage.data.title.trim() || t("ui.bundlePage.title");

  return (
    <Site.Page documentTitle={displayTitle}>
      <form id={manage.form.formId} onSubmit={handleSubmit} className="space-y-6" noValidate>
        <ManageHeader />
        <ManageMetadataTab />
        <ConfirmDialog
          open={manage.navigationBlockerStatus === "blocked"}
          onOpenChange={(open) => {
            if (!open) {
              manage.navigationBlockerReset?.();
            }
          }}
          description={t("ui.uploadDetail.actions.leaveConfirm")}
          tone="destructive"
          cancelLabel={t("ui.uploadDetail.actions.cancel")}
          confirmContent={
            <>
              <DoorOpen className="size-4" aria-hidden />
              <span className="ml-2">{t("ui.uploadDetail.actions.leave")}</span>
            </>
          }
          onConfirm={() => {
            manage.navigationBlockerProceed?.();
          }}
        />
        <ConfirmDialog
          open={manage.deleteDialogOpen}
          onOpenChange={manage.setDeleteDialogOpen}
          description={
            manage.deleteDialogMode === "delete"
              ? t("ui.uploadDetail.delete.confirm.deleteDescription")
              : t("ui.uploadDetail.delete.confirm.discardDescription")
          }
          tone="destructive"
          cancelLabel={t("ui.uploadDetail.actions.cancel")}
          confirmContent={
            <>
              {manage.isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <DeleteIcon className="size-4" />
              )}
              <span className="ml-2">
                {manage.deleteDialogMode === "delete"
                  ? t("ui.uploadDetail.actions.delete")
                  : t("ui.uploadDetail.actions.discard")}
              </span>
            </>
          }
          isBusy={manage.isDeleting}
          onConfirm={manage.handleDeleteConfirm}
        />
      </form>
    </Site.Page>
  );
}
