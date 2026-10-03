import { Link } from "@tanstack/react-router";
import {
  CalendarArrowUp,
  CalendarCheck2,
  Download,
  FileChartColumn,
  FileEdit,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type { BundlePublicDetail } from "@pgko.dev/schema";

import { UploaderWithCollaboratorsRow } from "@/components/bundle/uploader-with-collaborators";
import { RemoteImage } from "@/components/remote-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/auth";
import { useBundleDownload } from "@/hooks/use-bundle-download";

export function BundleDetailHeader({
  data,
  bundleId,
  displayTitle,
}: Readonly<{
  data: BundlePublicDetail;
  bundleId: string;
  displayTitle: string;
}>) {
  const { t } = useTranslation();
  const { downloadUrl } = useBundleDownload(bundleId);

  return (
    <header className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
      <RemoteImage
        src={data.coverUrl}
        alt=""
        className="size-16 shrink-0 bg-muted sm:size-20"
        fallbackIconClassName="size-6 text-muted-foreground"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <h2
          className="line-clamp-2 text-lg leading-snug font-semibold tracking-tight sm:text-xl"
          title={displayTitle}
        >
          {displayTitle}
        </h2>
        {data.artist ? (
          <p className="truncate text-sm text-muted-foreground" title={data.artist}>
            {data.artist}
          </p>
        ) : null}
        {data.uploadedBy ? (
          <UploaderWithCollaboratorsRow
            layout="page"
            uploadedBy={data.uploadedBy}
            collaborators={data.collaborators ?? []}
          />
        ) : null}
      </div>
      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
        <BundleDetails data={data} />
        <a href={downloadUrl} className={buttonVariants()}>
          <Download className="size-4" />
          {t("ui.bundlePage.download")}
        </a>
        <BundleDetailEditButton data={data} bundleId={bundleId} />
      </div>
    </header>
  );
}

function BundleDetails({ data }: Readonly<{ data: BundlePublicDetail }>) {
  const { t } = useTranslation();
  const releasedAt = data.releasedAt ? new Date(data.releasedAt) : null;
  const reuploadedAt = data.reuploadedAt ? new Date(data.reuploadedAt) : null;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <Info />
        {t("ui.bundlePage.details")}
      </DialogTrigger>
      <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("ui.bundlePage.details")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {releasedAt ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarCheck2 className="size-4" />
              <time dateTime={releasedAt.toISOString()}>
                {t("ui.bundlePage.releasedAt", { date: releasedAt.toLocaleDateString() })}
              </time>
            </div>
          ) : null}
          {reuploadedAt ? (
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <CalendarArrowUp className="size-4" />
              <time dateTime={reuploadedAt.toISOString()}>
                {t("ui.bundlePage.reuploadedAt", { date: reuploadedAt.toLocaleDateString() })}
              </time>
              <Badge variant="secondary">v{data.revision}</Badge>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Download className="size-4" />
            {t("ui.bundlePage.downloadCount", { count: data.downloadCount })}
          </div>
          {data.description ? (
            <p className="border-t pt-3 whitespace-pre-wrap text-muted-foreground">
              {data.description}
            </p>
          ) : null}
          {data.tags.length ? (
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BundleDetailEditButton({
  data,
  bundleId,
}: Readonly<{ data: BundlePublicDetail; bundleId: string }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return null;
  const uploaderId = data.uploadedBy?.slug ?? data.uploadedBy?.id;
  const isOwner = uploaderId && (user.slug === uploaderId || user.id === uploaderId);
  const isCollaborator = data.collaborators?.some((collaborator) => collaborator.id === user.id);
  if (!isOwner && !isCollaborator) return null;
  const Icon = isCollaborator ? FileChartColumn : FileEdit;
  const label = t(isCollaborator ? "ui.bundlePage.viewStats" : "ui.bundlePage.edit");

  return (
    <Link
      to="/bundles/$bundleId/manage"
      params={{ bundleId }}
      className={buttonVariants({ variant: "outline", size: "icon" })}
      aria-label={label}
      title={label}
    >
      <Icon className="size-4" />
    </Link>
  );
}
