import { createFileRoute } from "@tanstack/react-router";
import { Ban, Check, CheckCircle2, Clock, Loader2, LogOut, X, XCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type { BundleListItem, CollaborationRequestStatus } from "@pgko.dev/schema";

import { BundleList } from "@/components/bundle";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Site } from "@/components/site";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/hooks/auth";
import { useAcceptCollaborationRequest } from "@/hooks/mutation/use-accept-collaboration-request";
import { useDeclineCollaborationRequest } from "@/hooks/mutation/use-decline-collaboration-request";
import { useDismissCollaborationRequest } from "@/hooks/mutation/use-dismiss-collaboration-request";
import { useLeaveCollaboration } from "@/hooks/mutation/use-leave-collaboration";
import { ensureAuthenticated } from "@/lib/ensure-auth";

export const Route = createFileRoute("/collaborations")({
  beforeLoad: async ({ context, location }) => {
    await ensureAuthenticated(context, location);
  },
  component: RouteComponent,
});

const STATUS_OPTIONS: CollaborationRequestStatus[] = ["pending", "accepted", "declined"];

const STATUS_ICONS: Record<
  CollaborationRequestStatus,
  React.ComponentType<{ className?: string }>
> = {
  pending: Clock,
  accepted: CheckCircle2,
  declined: XCircle,
};

function RouteComponent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [status, setStatus] = useState<CollaborationRequestStatus>("pending");

  const { mutate: accept, isPending: isAccepting } = useAcceptCollaborationRequest();
  const { mutateAsync: decline, isPending: isDeclining } = useDeclineCollaborationRequest();
  const { mutate: dismiss, isPending: isDismissing } = useDismissCollaborationRequest();
  const { mutateAsync: leave, isPending: isLeaving } = useLeaveCollaboration();

  const [leaveDialogBundleId, setLeaveDialogBundleId] = useState<string | null>(null);
  const [declineDialogBundleId, setDeclineDialogBundleId] = useState<string | null>(null);

  const busy = isAccepting || isDeclining || isDismissing || isLeaving;

  const handleLeaveConfirm = async () => {
    if (!leaveDialogBundleId) return;
    await leave(leaveDialogBundleId);
    setLeaveDialogBundleId(null);
  };

  const handleDeclineConfirm = async () => {
    if (!declineDialogBundleId) return;
    await decline(declineDialogBundleId);
    setDeclineDialogBundleId(null);
  };

  const handleStatusChange = useCallback((v: string[]) => {
    const next = v[0];
    if (next) setStatus(next as CollaborationRequestStatus);
  }, []);

  const renderExtraActions = useCallback(
    (bundle: BundleListItem, isMobile: boolean) => {
      const strokeWidth = isMobile ? 2 : 2.5;
      if (status === "pending") {
        return (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                accept(bundle.id);
              }}
              disabled={busy}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[color,transform] duration-200 ease-out hover:bg-emerald-500/10 hover:text-emerald-600 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none disabled:opacity-40"
              title={t("ui.collaborations.accept")}
            >
              {isAccepting ? (
                <Loader2 className="size-5 animate-spin" strokeWidth={strokeWidth} />
              ) : (
                <Check className="size-5" strokeWidth={strokeWidth} />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeclineDialogBundleId(bundle.id);
              }}
              disabled={busy}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[color,transform] duration-200 ease-out hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none disabled:opacity-40"
              title={t("ui.collaborations.decline")}
            >
              <X className="size-5" strokeWidth={strokeWidth} />
            </button>
          </>
        );
      }

      if (status === "accepted") {
        return (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLeaveDialogBundleId(bundle.id);
            }}
            disabled={busy}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[color,transform] duration-200 ease-out hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none disabled:opacity-40"
            title={t("ui.collaborations.leave")}
          >
            <LogOut className="size-5" strokeWidth={strokeWidth} />
          </button>
        );
      }

      if (status === "declined") {
        return (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss(bundle.id);
            }}
            disabled={busy}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[color,transform] duration-200 ease-out hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none disabled:opacity-40"
            title={t("ui.collaborations.dismiss")}
          >
            {isDismissing ? (
              <Loader2 className="size-5 animate-spin" strokeWidth={strokeWidth} />
            ) : (
              <X className="size-5" strokeWidth={strokeWidth} />
            )}
          </button>
        );
      }

      return null;
    },
    [status, busy, isAccepting, isDismissing, accept, dismiss, t],
  );

  return (
    <Site.Page
      title={t("ui.collaborations.title")}
      description={t("ui.collaborations.description")}
    >
      <BundleList
        currentUserId={user?.id}
        noLinkUserId={user?.id}
        collaborationStatus={status}
        searchPlaceholder={t("ui.bundleList.searchPlaceholder")}
        renderExtraActions={renderExtraActions}
        extraFilters={
          <ToggleGroup
            value={[status]}
            onValueChange={handleStatusChange}
            variant="outline"
            size="sm"
            spacing={0}
            className="w-fit"
          >
            {STATUS_OPTIONS.map((s) => {
              const Icon = STATUS_ICONS[s];
              return (
                <ToggleGroupItem key={s} value={s} className="gap-1.5">
                  <Icon className="size-4" />
                  {t(`ui.collaborations.${s}Title`)}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        }
      />

      <ConfirmDialog
        open={leaveDialogBundleId !== null}
        onOpenChange={(open) => {
          if (!open) setLeaveDialogBundleId(null);
        }}
        description={t("ui.collaborations.leaveConfirm")}
        tone="destructive"
        cancelLabel={t("ui.collaborations.cancel")}
        confirmContent={
          <>
            {isLeaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            <span className="ml-2">{t("ui.collaborations.leave")}</span>
          </>
        }
        isBusy={isLeaving}
        onConfirm={handleLeaveConfirm}
      />

      <ConfirmDialog
        open={declineDialogBundleId !== null}
        onOpenChange={(open) => {
          if (!open) setDeclineDialogBundleId(null);
        }}
        description={t("ui.collaborations.declineConfirm")}
        tone="destructive"
        cancelLabel={t("ui.collaborations.cancel")}
        confirmContent={
          <>
            {isDeclining ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
            <span className="ml-2">{t("ui.collaborations.decline")}</span>
          </>
        }
        isBusy={isDeclining}
        onConfirm={handleDeclineConfirm}
      />
    </Site.Page>
  );
}
