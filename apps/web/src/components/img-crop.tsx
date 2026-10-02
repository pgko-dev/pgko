import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { type SyntheticEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, type PixelCrop } from "react-image-crop";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import "react-image-crop/dist/ReactCrop.css";

interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The file to crop. Dialog content is only rendered when this is non-null. */
  file: File | null;
  /** Aspect ratio for the crop area (e.g. 1 for square avatar, 16/9 for cover). */
  aspect: number;
  /** Show circular crop overlay. Defaults to false. */
  circularCrop?: boolean;
  /** Max output pixel size (longest edge). The cropped image is downsized to fit. */
  maxPixelSize?: number;
  /** Called with the cropped image blob when user confirms. */
  onCrop: (blob: Blob) => void;
}

function makeMaxCrop(aspect: number, width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 100 }, aspect, width, height),
    width,
    height,
  );
}

export function ImageCropper({
  open,
  onOpenChange,
  file,
  aspect,
  circularCrop,
  maxPixelSize,
  onCrop,
}: Readonly<ImageCropperProps>) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const previewUrl = useObjectUrl(file);

  const applyCrop = useCallback(
    (width: number, height: number) => {
      const pct = makeMaxCrop(aspect, width, height);
      setCrop(pct);
      setCompletedCrop({
        unit: "px",
        x: Math.round((pct.x / 100) * width),
        y: Math.round((pct.y / 100) * height),
        width: Math.round((pct.width / 100) * width),
        height: Math.round((pct.height / 100) * height),
      });
    },
    [aspect],
  );

  const onImageLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      applyCrop(e.currentTarget.width, e.currentTarget.height);
    },
    [applyCrop],
  );

  const handleReset = useCallback(() => {
    if (!imgRef.current) return;
    applyCrop(imgRef.current.width, imgRef.current.height);
  }, [applyCrop]);

  const handleConfirm = useCallback(() => {
    const image = imgRef.current;
    if (!image || !completedCrop?.width || !completedCrop?.height) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const srcW = completedCrop.width * scaleX;
    const srcH = completedCrop.height * scaleY;

    let outW = srcW;
    let outH = srcH;
    if (maxPixelSize && (srcW > maxPixelSize || srcH > maxPixelSize)) {
      const ratio = Math.min(maxPixelSize / srcW, maxPixelSize / srcH);
      outW = Math.round(srcW * ratio);
      outH = Math.round(srcH * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      srcW,
      srcH,
      0,
      0,
      outW,
      outH,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob);
          onOpenChange(false);
        }
      },
      "image/png",
      1.0,
    );
  }, [completedCrop, maxPixelSize, onCrop, onOpenChange]);

  const hasNoCrop = !completedCrop?.width || !completedCrop?.height;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        {previewUrl && (
          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, pct) => setCrop(pct)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              circularCrop={circularCrop}
              className="max-h-[60vh] [&>div]:max-h-[60vh]"
            >
              <img
                ref={imgRef}
                src={previewUrl}
                alt=""
                onLoad={onImageLoad}
                className="max-h-[60vh] max-w-full"
              />
            </ReactCrop>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcwIcon className="mr-1.5 size-4" />
            {t("ui.imageCropper.reset")}
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={hasNoCrop}>
            <CheckIcon className="mr-1.5 size-4" />
            {t("ui.imageCropper.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Creates an object URL for a File and revokes it on cleanup. */
function useObjectUrl(file: File | null): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!file) {
      // oxlint-disable-next-line react/set-state-in-effect -- blob URL lifecycle
      setUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    // oxlint-disable-next-line react/set-state-in-effect -- blob URL lifecycle
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}
