import { Link } from "@tanstack/react-router";
import {
  AtSign,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  Image,
  Loader2,
  Mic,
  Music2,
  Pencil,
  Save,
  Tags,
  Trash2,
  Type,
  Upload,
  UserPlus,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { type ComponentType, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";

import { sanitizeTags } from "@pgko-dev/common";
import { BundleRules } from "@pgko-dev/config";
import type {
  BundleCollaborationRequestForOwner,
  BundleVisibility,
  ProcessResult,
} from "@pgko-dev/schema";

import { ScrollToTopButton } from "@/components/bundle/scroll-to-top-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@/components/custom/autocomplete";
import InputTags from "@/components/custom/input-tag";
import { DifficultyLevelInline } from "@/components/difficulty-level-display";
import { ImageCropper } from "@/components/img-crop";
import { ProcessResultRow } from "@/components/manage/process-result-row";
import { RemoteImage } from "@/components/remote-image";
import { SongPanel } from "@/components/song-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useCancelCollaborationRequest } from "@/hooks/mutation/use-cancel-collaboration-request";
import { useInviteCollaborator } from "@/hooks/mutation/use-invite-collaborator";
import { useBundleCollaborationRequests } from "@/hooks/query/use-bundle-collaboration-requests";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { formatBytes } from "@/lib/format-bytes";
import { cn } from "@/lib/utils";

import { AutoScrollMarquee } from "../auto-scroll-marquee";

import { useBundleManageContext } from "./use-bundle-manage";

type VideoOptionSong = {
  difficulty: number;
  level: string;
  constant: number;
  weAttribute: string | null;
  title: string;
  artist: string;
};

function RepresentativeVideoOptionRow({
  song,
  label,
  labelClassName,
}: Readonly<{
  song: VideoOptionSong;
  label: string;
  labelClassName?: string;
}>) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="w-14 shrink-0">
        <AutoScrollMarquee className="flex" align="center">
          <DifficultyLevelInline
            difficulty={song.difficulty}
            level={song.level}
            constant={song.constant}
            weAttribute={song.weAttribute}
          />
        </AutoScrollMarquee>
      </div>
      <AutoScrollMarquee className={labelClassName} align="start">
        {label}
      </AutoScrollMarquee>
    </div>
  );
}

type CollaboratorsCardProps = {
  bundleId: string;
};

function CollaborationRequestRow({
  request,
  onCancel,
  isCancelling,
}: Readonly<{
  request: BundleCollaborationRequestForOwner;
  onCancel?: (toUserId: string) => void;
  isCancelling?: boolean;
}>) {
  const { t } = useTranslation();
  const isConfirmed = request.status === "accepted";
  const isPending = request.status === "pending";
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRemoveClick = () => {
    if (isConfirmed) {
      setConfirmOpen(true);
      return;
    }
    onCancel?.(request.toUser.id);
  };

  const handleConfirmRemove = () => {
    onCancel?.(request.toUser.id);
    setConfirmOpen(false);
  };

  return (
    <li className="inline-flex">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-sm",
          "w-fit max-w-full min-w-0",
          isPending ? "border-dashed border-amber-500/40" : "border-border",
          request.status === "declined" && "border-destructive/30 opacity-70",
        )}
      >
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            isConfirmed && "bg-emerald-500",
            isPending && "bg-amber-500",
            request.status === "declined" && "bg-red-500",
          )}
          aria-hidden
        />
        <Link
          to="/users/$jointId"
          params={{ jointId: request.toUser.slug ?? request.toUser.id }}
          className="text-primary hover:underline"
        >
          <AutoScrollMarquee className="max-w-[250px] min-w-0">
            {request.toUser.name}
          </AutoScrollMarquee>
        </Link>

        {onCancel && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-5 shrink-0 rounded-full hover:bg-destructive/20 hover:text-destructive"
              disabled={isCancelling}
              onClick={handleRemoveClick}
              aria-label={t("ui.manage.collaborators.removeRequest")}
            >
              <X className="size-3.5" />
            </Button>
            {isConfirmed && (
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                description={t("ui.manage.collaborators.removeCollaboratorConfirm", {
                  name: request.toUser.name,
                })}
                tone="destructive"
                cancelLabel={t("ui.manage.collaborators.cancelRemove")}
                confirmContent={
                  <>
                    {isCancelling ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
                    <span className="ml-2">{t("ui.manage.collaborators.removeRequest")}</span>
                  </>
                }
                isBusy={isCancelling}
                onConfirm={handleConfirmRemove}
              />
            )}
          </>
        )}
      </span>
    </li>
  );
}

function CollaboratorsListSection({
  titleKey,
  icon,
  badgeVariant,
  requests,
  onCancel,
  isCancelling,
  isLoading,
}: Readonly<{
  titleKey:
    | "ui.manage.collaborators.listLabel"
    | "ui.manage.collaborators.pendingLabel"
    | "ui.manage.collaborators.declinedLabel";
  icon: ReactNode;
  badgeVariant: "success" | "secondary" | "destructive";
  requests: BundleCollaborationRequestForOwner[];
  onCancel?: (toUserId: string) => void;
  isCancelling?: boolean;
  isLoading?: boolean;
}>) {
  const { t } = useTranslation();
  if (isLoading || requests.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-sm font-medium">{t(titleKey)}</p>
        <Badge variant={badgeVariant} className="h-4 min-w-4 px-1 text-[10px]">
          {requests.length}
        </Badge>
      </div>
      <ul className="flex flex-wrap gap-1.5 text-sm text-muted-foreground">
        {requests.map((req) => (
          <CollaborationRequestRow
            key={req.id}
            request={req}
            onCancel={onCancel}
            isCancelling={isCancelling}
          />
        ))}
      </ul>
    </div>
  );
}

function InviteCollaboratorForm({ bundleId }: Readonly<{ bundleId: string }>) {
  const { t } = useTranslation();
  const inviteInputId = useId();
  const { mutateAsync: invite, isPending: isInviting } = useInviteCollaborator(bundleId);
  const [jointId, setJointId] = useState("");
  const trimmed = jointId.trim();

  const handleInvite = async () => {
    if (!trimmed) return;
    try {
      await invite(trimmed);
      setJointId("");
    } catch {
      // ignored
    }
  };

  return (
    <div className="space-y-2">
      <Field className="max-w-full">
        <FieldLabel htmlFor={inviteInputId}>{t("ui.manage.collaborators.inviteTitle")}</FieldLabel>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText>
              <AtSign className="size-4" aria-hidden />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id={inviteInputId}
            type="text"
            value={jointId}
            onChange={(e) => setJointId(e.target.value)}
            placeholder={t("ui.manage.collaborators.invitePlaceholder")}
            disabled={isInviting}
            className="w-full"
          />
        </InputGroup>
      </Field>
      <Button type="button" disabled={isInviting || !trimmed} onClick={() => void handleInvite()}>
        {isInviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        <span className="ml-2">{t("ui.manage.collaborators.invite")}</span>
      </Button>
    </div>
  );
}

function CollaboratorsCard({ bundleId }: Readonly<CollaboratorsCardProps>) {
  const { t } = useTranslation();
  const { data: requestsData, isPending: isRequestsLoading } =
    useBundleCollaborationRequests(bundleId);
  const { mutateAsync: cancelRequestMut, isPending: isCancelling } =
    useCancelCollaborationRequest();
  const requests = requestsData?.requests ?? [];
  const acceptedRequests = requests.filter((r) => r.status === "accepted");
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const declinedRequests = requests.filter((r) => r.status === "declined");
  const hasAnyRequests = requests.length > 0;

  const cancelRequest = (toUserId: string) => cancelRequestMut({ bundleId, toUserId });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="size-4" aria-hidden />
          {t("ui.manage.collaborators.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRequestsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        ) : (
          hasAnyRequests && (
            <div className="space-y-3">
              <CollaboratorsListSection
                titleKey="ui.manage.collaborators.listLabel"
                icon={<CheckCircle2 className="size-3.5" />}
                badgeVariant="success"
                requests={acceptedRequests}
                onCancel={cancelRequest}
                isCancelling={isCancelling}
              />
              <CollaboratorsListSection
                titleKey="ui.manage.collaborators.pendingLabel"
                icon={<Clock className="size-3.5" />}
                badgeVariant="secondary"
                requests={pendingRequests}
                onCancel={cancelRequest}
                isCancelling={isCancelling}
                isLoading={isRequestsLoading}
              />
              <CollaboratorsListSection
                titleKey="ui.manage.collaborators.declinedLabel"
                icon={<XCircle className="size-3.5" />}
                badgeVariant="destructive"
                requests={declinedRequests}
              />
            </div>
          )
        )}
        <InviteCollaboratorForm bundleId={bundleId} />
      </CardContent>
    </Card>
  );
}

export function FailedProcessResultsCard({ results }: Readonly<{ results: ProcessResult[] }>) {
  const { t } = useTranslation();

  if (!results.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleAlert className="size-4" aria-hidden />
          {t("ui.uploadDetail.results.title")}
        </CardTitle>
        <CardDescription>{t("ui.uploadDetail.results.canStillRelease")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="max-h-64 overflow-y-auto pr-2">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((r) => (
              <ProcessResultRow key={`${r.type}-${r.filePath}`} result={r} />
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export function BundleMetadataSection() {
  const { t } = useTranslation();
  const manage = useBundleManageContext();
  const { form, schemas, data, songs, videoUrlBySongId } = manage;

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChevronRight className="size-4" />
          {t("ui.uploadDetail.metadata.info")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <form.AppField name="title" validators={{ onChange: schemas.title }}>
            {(field) => (
              <field.InputField
                {...BundleRules.title}
                label={t("ui.uploadDetail.metadata.title")}
                inlineStart={<Type className="size-4" aria-hidden />}
                placeholder={data.songs?.[0]?.title ?? ""}
                className="w-full"
              />
            )}
          </form.AppField>
          <form.AppField name="artist" validators={{ onChange: schemas.artist }}>
            {(field) => (
              <field.InputField
                {...BundleRules.artist}
                label={t("ui.uploadDetail.metadata.artist")}
                inlineStart={<Mic className="size-4" aria-hidden />}
                placeholder={data.songs?.[0]?.artist ?? ""}
                className="w-full"
              />
            )}
          </form.AppField>
        </div>
        <form.AppField name="description" validators={{ onChange: schemas.description }}>
          {(field) => (
            <field.TextareaField
              {...BundleRules.description}
              label={t("ui.uploadDetail.metadata.description")}
              className="min-h-[88px] w-full resize-y"
            />
          )}
        </form.AppField>
        <form.AppField name="tags" validators={{ onChange: schemas.tags }}>
          {(field) => (
            <Field
              data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
              className="max-w-full"
            >
              <FieldLabel htmlFor={field.name}>{t("ui.uploadDetail.metadata.tags")}</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <InputGroupText>
                    <Tags className="size-4" aria-hidden />
                  </InputGroupText>
                </InputGroupAddon>
                <InputTags
                  inputGroup
                  id={field.name}
                  value={field.state.value as string[]}
                  onChange={(value) => field.handleChange(sanitizeTags(value))}
                  className="w-full"
                  maxLength={BundleRules.tag.maxLength}
                  maxTags={BundleRules.tags.maxLength}
                  autoCapitalize={BundleRules.tag.autoCapitalize}
                  pattern={BundleRules.tag.pattern.source}
                />
              </InputGroup>
              <FieldDescription>
                {t("ui.uploadDetail.metadata.tagsHint", {
                  max: BundleRules.tags.maxLength,
                  min: BundleRules.tag.minLength,
                })}
                <br />
                <Trans
                  i18nKey="ui.uploadDetail.metadata.tagsFormatHint"
                  components={{ enter: <Kbd /> }}
                />
              </FieldDescription>
              {field.state.meta.isTouched && !field.state.meta.isValid && (
                <FieldError errors={field.state.meta.errors} />
              )}
            </Field>
          )}
        </form.AppField>
        <form.AppField name="visibility">
          {(field) => {
            const visibility = (field.state.value as BundleVisibility) ?? "public";
            const locked = data.visibilityLocked;
            const visibilityLabelKeys = {
              unlisted: "ui.uploadDetail.metadata.visibilityOptions.unlisted",
              profile_only: "ui.uploadDetail.metadata.visibilityOptions.profileOnly",
              public: "ui.uploadDetail.metadata.visibilityOptions.public",
            } as const;
            const optionLabel = (value: BundleVisibility) => t(visibilityLabelKeys[value]);

            return (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  {t("ui.uploadDetail.metadata.visibility")}
                </FieldLabel>
                <Select
                  value={visibility}
                  disabled={locked}
                  onValueChange={(value) => {
                    if (value) {
                      field.handleChange(value as BundleVisibility);
                    }
                  }}
                >
                  <SelectTrigger id={field.name} className="w-fit max-w-full">
                    <SelectValue>{optionLabel(visibility)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      {t("ui.uploadDetail.metadata.visibilityOptions.public")}
                    </SelectItem>
                    <SelectItem value="profile_only">
                      {t("ui.uploadDetail.metadata.visibilityOptions.profileOnly")}
                    </SelectItem>
                    <SelectItem value="unlisted">
                      {t("ui.uploadDetail.metadata.visibilityOptions.unlisted")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {locked && (
                  <FieldDescription>
                    {t("ui.uploadDetail.metadata.visibilityLockedNotice")}
                  </FieldDescription>
                )}
              </Field>
            );
          }}
        </form.AppField>
        {songs.length > 1 && (
          <form.AppField name="videoUrl" validators={{ onChange: schemas.videoUrl }}>
            {(field) => {
              const videoOptions = songs
                .map((song) => {
                  const url = videoUrlBySongId?.[song.id]?.trim();
                  if (!url) return null;
                  return { song, url };
                })
                .filter((option) => option !== null) as {
                song: (typeof songs)[number];
                url: string;
              }[];

              const hasOptions = videoOptions.length > 0;

              return (
                <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("ui.uploadDetail.metadata.representativeVideo")}
                  </FieldLabel>
                  <Autocomplete
                    value={(field.state.value as string) ?? ""}
                    onValueChange={(value) => field.handleChange(value)}
                    items={videoOptions.map((option) => option.url)}
                    mode="none"
                    openOnInputClick
                  >
                    <AutocompleteInput
                      {...BundleRules.videoUrl}
                      id={field.name}
                      showTrigger={hasOptions}
                      showClear={!!((field.state.value as string) ?? "").trim()}
                    />
                    {hasOptions && (
                      <AutocompleteContent>
                        <AutocompleteList>
                          {videoOptions.map((option) => (
                            <AutocompleteItem key={option.song.id} value={option.url}>
                              <RepresentativeVideoOptionRow
                                song={option.song}
                                label={`${option.song.title} - ${option.song.artist}`}
                                labelClassName="flex"
                              />
                            </AutocompleteItem>
                          ))}
                        </AutocompleteList>
                      </AutocompleteContent>
                    )}
                  </Autocomplete>
                  <FieldDescription>
                    <Trans
                      i18nKey="ui.uploadDetail.metadata.representativeVideoHint"
                      components={{
                        icon: (
                          <span className="inline-flex items-center justify-center align-middle">
                            <Video className="size-3.5" />
                          </span>
                        ),
                      }}
                    />
                  </FieldDescription>
                  {field.state.meta.isTouched && !field.state.meta.isValid && (
                    <FieldError errors={field.state.meta.errors} />
                  )}
                </Field>
              );
            }}
          </form.AppField>
        )}
      </CardContent>
    </Card>
  );
}

function BundleCoverSection() {
  const { t } = useTranslation();
  const manage = useBundleManageContext();
  const { data } = manage;
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverDeleteDialogOpen, setCoverDeleteDialogOpen] = useState(false);
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);

  if (!data) return null;

  const isCoverBusy = manage.isUploadingCover || manage.isRemovingCover;

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (!file) return;
    if (!BundleRules.cover.allowedMimeTypes.includes(file.type)) {
      toast.error(t("ui.fileUpload.error.typeNotAccepted"));
      return;
    }
    setCoverCropFile(file);
    setCoverCropOpen(true);
  };

  const handleCoverCrop = (blob: Blob) => {
    const croppedFile = new File([blob], "cover.png", { type: "image/png" });
    setCoverCropFile(null);
    if (croppedFile.size > BundleRules.cover.maxFileBytes) {
      toast.error(
        t("ui.fileUpload.error.fileTooLarge", {
          size: formatBytes(BundleRules.cover.maxFileBytes),
        }),
      );
      return;
    }
    manage.uploadCover(croppedFile);
  };

  let CoverIcon: ComponentType<{ className?: string }> = data.coverUrl ? Pencil : Upload;
  if (isCoverBusy) CoverIcon = Spinner;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="size-4" aria-hidden />
            {t("ui.uploadDetail.cover.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-row items-stretch gap-4">
          <input
            ref={coverInputRef}
            type="file"
            accept={BundleRules.cover.allowedMimeTypes.join(",")}
            onChange={handleCoverFileChange}
            className="sr-only"
            aria-label={
              data.coverUrl ? t("ui.uploadDetail.cover.change") : t("ui.uploadDetail.cover.upload")
            }
          />
          <div
            className={cn(
              "relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg",
              "border-1 border-border bg-muted",
              isCoverBusy && "pointer-events-none",
            )}
          >
            <RemoteImage
              src={data.coverUrl}
              alt=""
              className="absolute inset-0 rounded-lg"
              fallbackIconClassName="size-10 text-muted-foreground"
            />
            {isCoverBusy && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50 transition-opacity">
                <Spinner className="size-6 text-white" />
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex min-h-24 min-w-32 shrink-0 flex-col items-start",
              data.coverUrl ? "justify-between" : "justify-end gap-3",
            )}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCoverBusy}
              onClick={() => coverInputRef.current?.click()}
              className="min-w-26 justify-center"
            >
              <CoverIcon className="size-4" />
              <span className="ml-2">
                {data.coverUrl
                  ? t("ui.uploadDetail.cover.change")
                  : t("ui.uploadDetail.cover.upload")}
              </span>
            </Button>
            {data.coverUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCoverBusy}
                onClick={() => setCoverDeleteDialogOpen(true)}
                className="min-w-26 justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {isCoverBusy ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
                <span className="ml-2">{t("ui.uploadDetail.cover.remove")}</span>
              </Button>
            )}
            <p className="text-xs whitespace-pre text-muted-foreground">
              {t("ui.settingsPage.avatarSection.hint", {
                size: formatBytes(BundleRules.cover.maxFileBytes),
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      <ImageCropper
        open={coverCropOpen}
        onOpenChange={(open) => {
          setCoverCropOpen(open);
          if (!open) setCoverCropFile(null);
        }}
        file={coverCropFile}
        aspect={1}
        maxPixelSize={BundleRules.cover.maxPixelSize * 2}
        onCrop={handleCoverCrop}
      />

      <ConfirmDialog
        open={coverDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isCoverBusy) setCoverDeleteDialogOpen(open);
        }}
        description={t("ui.uploadDetail.cover.removeConfirm")}
        tone="destructive"
        cancelLabel={t("ui.uploadDetail.actions.cancel")}
        confirmContent={
          <>
            {isCoverBusy ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
            <span className="ml-2">{t("ui.uploadDetail.cover.remove")}</span>
          </>
        }
        isBusy={isCoverBusy}
        onConfirm={() => {
          setCoverDeleteDialogOpen(false);
          manage.handleCoverRemove();
        }}
      />
    </>
  );
}

export function ManageMetadataTab() {
  const { t } = useTranslation();
  const manage = useBundleManageContext();
  const {
    form,
    schemas,
    data,
    songs,
    failedProcessResults,
    handlePlayPreview,
    previewPlayingId,
    previewAudioRef,
    stopPreview,
    isSaving,
    isReleasing,
    isDeleting,
    isReleased,
    isDefaultValue,
  } = manage;

  useEffect(() => () => stopPreview(), [stopPreview]);

  const { visible: showScrollToTop, scrollToTop } = useScrollToTop();

  if (!data) return null;

  return (
    <div className="mt-4 space-y-6">
      <ScrollToTopButton
        visible={showScrollToTop}
        onClick={scrollToTop}
        ariaLabel={t("ui.bundleList.backToTop")}
      />

      <FailedProcessResultsCard results={failedProcessResults} />

      <BundleCoverSection />

      <BundleMetadataSection />

      {isReleased && <CollaboratorsCard bundleId={manage.bundleId} />}

      {songs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music2 className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              {t("ui.bundlePage.songsSectionTitle", { count: songs.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {songs.map((song) => (
                <form.AppField
                  key={song.id}
                  name={`videoUrlBySongId.${song.id}`}
                  validators={{ onChange: schemas.videoUrl }}
                >
                  {(field) => (
                    <SongPanel
                      song={song}
                      videoUrl={field.state.value}
                      onVideoUrlChange={field.handleChange}
                      onVideoUrlBlur={field.handleBlur}
                      videoUrlInvalid={field.state.meta.isTouched && !field.state.meta.isValid}
                      onPlayPreview={handlePlayPreview}
                      isPreviewPlaying={previewPlayingId === song.id}
                    />
                  )}
                </form.AppField>
              ))}
            </div>
            <audio ref={previewAudioRef} onEnded={stopPreview} hidden>
              <track kind="captions" />
            </audio>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-start gap-2">
        {isReleased ? (
          <Button
            type="submit"
            form={form.formId}
            disabled={isSaving || isReleasing || isDeleting || isDefaultValue}
            aria-label={
              isSaving ? t("ui.uploadDetail.actions.saving") : t("ui.uploadDetail.actions.save")
            }
          >
            {isSaving || isReleasing ? <Spinner className="size-4" /> : <Save className="size-4" />}
            <span className="ml-2">
              {isSaving || isReleasing
                ? t("ui.uploadDetail.actions.saving")
                : t("ui.uploadDetail.actions.save")}
            </span>
          </Button>
        ) : (
          <>
            <Button
              type="submit"
              form={form.formId}
              disabled={isSaving || isReleasing || isDeleting}
              aria-label={
                isSaving || isReleasing
                  ? t("ui.uploadDetail.actions.submitting")
                  : t("ui.uploadDetail.actions.submit")
              }
            >
              {isSaving || isReleasing ? (
                <Spinner className="size-4" />
              ) : (
                <Upload className="size-4" />
              )}
              <span className="ml-2">
                {isSaving || isReleasing
                  ? t("ui.uploadDetail.actions.submitting")
                  : t("ui.uploadDetail.actions.submit")}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving || isReleasing || isDeleting}
              onClick={manage.handleDiscard}
              aria-label={t("ui.uploadDetail.actions.discard")}
            >
              <Trash2 className="size-4" />
              <span className="ml-2">{t("ui.uploadDetail.actions.discard")}</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
