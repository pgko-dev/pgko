import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function UserProfileLayout({
  avatar,
  identity,
  metadata,
  bio,
  className,
}: Readonly<{
  avatar: ReactNode;
  identity: ReactNode;
  metadata: ReactNode;
  bio?: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {avatar}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {identity}
          <div className="flex flex-col gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm">
            {metadata}
          </div>
        </div>
      </div>
      {bio ? <div className="mt-6">{bio}</div> : null}
    </div>
  );
}
