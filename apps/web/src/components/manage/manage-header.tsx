import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Download, Eye, FileEdit, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AutoScrollMarquee } from "@/components/auto-scroll-marquee";
import { RemoteImage } from "@/components/remote-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Spinner } from "@/components/ui/spinner";
import { useBundleDownload } from "@/hooks/use-bundle-download";
import { useIsMobile } from "@/hooks/use-mobile";
import { clearBundleReturnTo, getBundleReturnTo } from "@/lib/bundle-return";
import { coverThemeToCssColor } from "@/lib/cover-theme";
import { cn } from "@/lib/utils";

import { useBundleManageContext } from "./use-bundle-manage";

export function ManageHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const manage = useBundleManageContext();
  const data = manage.data;
  const isMobile = useIsMobile();
  const download = useBundleDownload(manage.bundleId);
  const handleBackClick = () => {
    const returnTo = getBundleReturnTo();
    if (returnTo) {
      clearBundleReturnTo();
      return router.navigate({ to: returnTo, resetScroll: false });
    }

    return router.navigate({ to: "/" });
  };
  if (!data) return null;

  const coverGlowColor = coverThemeToCssColor(data.coverThemeColor);
  const coverBoxShadow = coverGlowColor
    ? `0 0 0 0 ${coverGlowColor}, 0 0 15px ${coverGlowColor}`
    : "0 0 0 0 rgba(100,100,100,0.35), 0 0 15px rgba(100,100,100,0.55)";

  const isBusy = manage.isUploadingCover || manage.isRemovingCover;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
          onClick={handleBackClick}
        >
          <ArrowLeft className="size-4" />
          {t("ui.uploadDetail.actions.back")}
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-col gap-2">
            <div
              className="group relative flex size-[175px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-border bg-muted"
              style={{
                boxShadow: coverBoxShadow,
                ...(coverGlowColor ? { borderColor: coverGlowColor } : {}),
              }}
            >
              <RemoteImage
                src={data.coverUrl}
                alt=""
                className="absolute inset-0 rounded-lg"
                fallbackIconClassName="size-12 text-muted-foreground"
              />
              {isBusy && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                  <Spinner className="size-6 text-white" />
                </div>
              )}
            </div>
          </div>
          <div
            className="flex min-w-0 flex-1 flex-col gap-0"
            style={{ minHeight: isMobile ? undefined : "150px" }}
          >
            <div className="flex flex-col gap-1">
              <div>
                <Badge
                  variant={data.status === "released" ? "success" : "info"}
                  className="inline-flex items-center gap-1.5"
                >
                  {data.status === "released" ? (
                    <>
                      <Globe className="size-3.5 shrink-0" aria-hidden />
                      {t("ui.uploadDetail.badge.released")}
                    </>
                  ) : (
                    <>
                      <FileEdit className="size-3.5 shrink-0" aria-hidden />
                      {t("ui.uploadDetail.badge.draft")}
                    </>
                  )}
                </Badge>
              </div>
              <div className="flex min-w-0 flex-col gap-0">
                <h2 className="min-w-0 overflow-hidden text-2xl font-semibold tracking-tight">
                  <AutoScrollMarquee className="text-2xl font-semibold tracking-tight">
                    {manage.displayTitle}
                  </AutoScrollMarquee>
                </h2>
                {manage.displayArtist ? (
                  <div className="min-w-0 overflow-hidden text-muted-foreground">
                    <AutoScrollMarquee className="text-muted-foreground">
                      {manage.displayArtist}
                    </AutoScrollMarquee>
                  </div>
                ) : null}
              </div>
            </div>
            {data.status === "released" && (
              <div
                className={cn("flex flex-wrap items-center gap-2", isMobile ? "mt-4" : "mt-auto")}
              >
                <a
                  href={download.downloadUrl}
                  className={`${buttonVariants({ variant: "outline" })} w-fit`}
                  aria-label={t("ui.bundlePage.download")}
                >
                  <Download className="size-4" />
                </a>
                <Link
                  type="button"
                  className={`${buttonVariants({ variant: "outline" })} w-fit`}
                  params={{ bundleId: manage.bundleId }}
                  to="/bundles/$bundleId"
                  aria-label={t("ui.uploadDetail.actions.viewBundle")}
                >
                  <Eye className="size-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
