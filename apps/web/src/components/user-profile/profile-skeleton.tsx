import { Skeleton } from "@/components/ui/skeleton";

import { UserProfileLayout } from "./user-profile-layout";

export function ProfileSkeleton() {
  return (
    <div aria-hidden>
      <UserProfileLayout
        avatar={<Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />}
        identity={<Skeleton className="h-6 w-40 max-w-full sm:h-7 sm:w-48" />}
        metadata={
          <>
            <Skeleton className="h-3.5 w-24 sm:w-28" />
            <Skeleton className="h-3.5 w-32 sm:w-36" />
          </>
        }
        bio={
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-4/5 rounded" />
            <Skeleton className="h-3.5 w-3/5 rounded" />
          </div>
        }
      />
    </div>
  );
}
