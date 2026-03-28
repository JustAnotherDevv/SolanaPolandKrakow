import { Skeleton } from "@/components/ui/skeleton";

export function FeedSkeleton() {
  return (
    <div className="snap-start relative w-full flex-shrink-0 bg-card" style={{ height: "100%" }}>
      <Skeleton className="absolute inset-0 rounded-none" />
      {/* Bottom content skeleton */}
      <div className="absolute bottom-6 left-4 right-16 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="w-24 h-3 rounded" />
        </div>
        <Skeleton className="w-3/4 h-4 rounded" />
        <Skeleton className="w-full h-3 rounded" />
        <Skeleton className="w-2/3 h-3 rounded" />
        <div className="flex gap-2">
          <Skeleton className="w-12 h-4 rounded-full" />
          <Skeleton className="w-10 h-4 rounded-full" />
          <Skeleton className="w-14 h-4 rounded-full" />
        </div>
      </div>
      {/* Right action skeleton */}
      <div className="absolute right-3 bottom-24 space-y-5">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="w-9 h-9 rounded-full" />
        ))}
      </div>
    </div>
  );
}
