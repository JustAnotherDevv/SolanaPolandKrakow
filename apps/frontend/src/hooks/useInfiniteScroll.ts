import { useEffect, useRef, useCallback } from "react";

export function useInfiniteScroll(onLoadMore: () => void, enabled = true) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stableCallback = useCallback(onLoadMore, [onLoadMore]);

  useEffect(() => {
    if (!enabled) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          stableCallback();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [stableCallback, enabled]);

  return { sentinelRef };
}
