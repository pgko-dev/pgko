import { BarChart3, DoorOpen, FileEdit, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Site } from "@/components/site";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ManageDeleteTab } from "./manage-delete-tab";
import { ManageHeader } from "./manage-header";
import { ManageLoading } from "./manage-loading";
import { ManageMetadataTab } from "./manage-metadata-tab";
import { ManageReuploadTab } from "./manage-reupload-tab";
import { ManageStatsTab } from "./manage-stats-tab";
import { useBundleManageContext } from "./use-bundle-manage";

export function ManageContent() {
  const { t } = useTranslation();
  const manage = useBundleManageContext();

  if (manage.isLoading || !manage.data) {
    return <ManageLoading />;
  }

  const isOwner = manage.data.role !== "collaborator";
  const visibleTabs = isOwner ? ["stat", "metadata", "reupload", "delete"] : ["stat"];

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
        <Tabs defaultValue={visibleTabs[0]} className="w-full">
          {visibleTabs.length > 1 && (
            <TabsList className="h-auto w-full flex-wrap gap-1">
              <TabsTrigger value="stat" className="gap-1.5">
                <BarChart3 className="size-4" />
                {t("ui.uploadDetail.tabs.stat")}
              </TabsTrigger>
              {isOwner && (
                <>
                  <TabsTrigger value="metadata" className="gap-1.5">
                    <FileEdit className="size-4" />
                    {t("ui.uploadDetail.tabs.metadata")}
                  </TabsTrigger>
                  <TabsTrigger value="reupload" className="gap-1.5">
                    {manage.isReuploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {t("ui.uploadDetail.tabs.reupload")}
                  </TabsTrigger>
                  <TabsTrigger value="delete" className="gap-1.5">
                    <Trash2 className="size-4" />
                    {t("ui.uploadDetail.tabs.delete")}
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          )}

          <TabsContent value="stat">
            <ManageStatsTab />
          </TabsContent>

          {isOwner && (
            <>
              <TabsContent value="metadata">
                <ManageMetadataTab />
              </TabsContent>

              <TabsContent value="reupload">
                <ManageReuploadTab />
              </TabsContent>

              <TabsContent value="delete">
                <ManageDeleteTab />
              </TabsContent>
            </>
          )}
        </Tabs>
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
        {isOwner && (
          <ConfirmDialog
            open={manage.deleteDialogOpen}
            onOpenChange={manage.setDeleteDialogOpen}
            description={t("ui.uploadDetail.delete.confirm.deleteDescription")}
            tone="destructive"
            cancelLabel={t("ui.uploadDetail.actions.cancel")}
            confirmContent={
              <>
                {manage.isDeleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                <span className="ml-2">{t("ui.uploadDetail.actions.delete")}</span>
              </>
            }
            isBusy={manage.isDeleting}
            onConfirm={manage.handleDeleteConfirm}
          />
        )}
      </form>
    </Site.Page>
  );
}
