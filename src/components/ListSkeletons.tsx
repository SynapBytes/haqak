import { Skeleton } from "@/components/ui/skeleton";

export const IssueCardSkeleton = () => (
  <div className="bg-card/80 border border-border/50 rounded-2xl p-5 md:p-6 space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-lg" />
      </div>
      <Skeleton className="h-5 w-24 rounded-lg" />
    </div>
    <Skeleton className="h-6 w-4/5 rounded-lg" />
    <Skeleton className="h-4 w-full rounded-lg" />
    <Skeleton className="h-4 w-3/4 rounded-lg" />
    <div className="flex items-center gap-2">
      <Skeleton className="h-6 w-20 rounded-lg" />
      <Skeleton className="h-6 w-24 rounded-lg" />
    </div>
  </div>
);

export const IssueGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <IssueCardSkeleton key={index} />
    ))}
  </div>
);

export const UserCardGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-card/80 border border-border/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded-lg" />
            <Skeleton className="h-3 w-1/2 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 flex-1 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

export const UserRowListSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-card/80 border border-border/50 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded-lg" />
            <Skeleton className="h-3 w-2/3 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);
