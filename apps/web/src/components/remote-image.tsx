import { Image } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type RemoteImageProps = Omit<ComponentProps<"div">, "children"> & {
  src?: string | null;
  alt: string;
  imgClassName?: string;
  fallbackIconClassName?: string;
  loading?: "lazy" | "eager";
};

/**
 * Remote URL image with pulse placeholder while loading and icon fallback on error or missing src.
 */
export function RemoteImage(props: RemoteImageProps) {
  return <RemoteImageInner key={props.src ?? ""} {...props} />;
}

function RemoteImageInner({
  src,
  alt,
  className,
  imgClassName,
  fallbackIconClassName,
  loading = "lazy",
  ...props
}: RemoteImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const showPlaceholder = !src || failed;
  const showLoading = Boolean(src) && !failed && !loaded;

  return (
    <div
      data-slot="remote-image"
      aria-busy={showLoading || undefined}
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-muted",
        className,
      )}
      {...props}
    >
      {showPlaceholder ? (
        <Image
          className={cn("shrink-0 text-muted-foreground", fallbackIconClassName ?? "size-8")}
          aria-hidden
        />
      ) : null}
      {src && !failed ? (
        <>
          {showLoading ? (
            <Skeleton className="absolute inset-0 z-0 rounded-none" aria-hidden />
          ) : null}
          <img
            src={src}
            alt={alt}
            loading={loading}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              "absolute inset-0 z-[1] block size-full object-cover transition-opacity duration-200",
              loaded ? "opacity-100" : "opacity-0",
              imgClassName,
            )}
          />
        </>
      ) : null}
    </div>
  );
}
