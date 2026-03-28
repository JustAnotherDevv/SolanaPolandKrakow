import { useState, useCallback, useRef } from "react";
import { FeedItem } from "@/components/feed/FeedItem";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { initialFeedItems, generateMoreItems } from "@/lib/mockData";
import type { FeedItem as FeedItemType } from "@/lib/mockData";

export function FeedPage() {
  const [items, setItems] = useState<FeedItemType[]>(initialFeedItems);
  const [loading, setLoading] = useState(false);
  const loadIndexRef = useRef(initialFeedItems.length);

  const loadMore = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      const newItems = generateMoreItems(loadIndexRef.current, 5);
      loadIndexRef.current += 5;
      setItems((prev) => [...prev, ...newItems]);
      setLoading(false);
    }, 800);
  }, [loading]);

  const { sentinelRef } = useInfiniteScroll(loadMore, !loading);

  return (
    <div
      className="h-full overflow-y-scroll no-scrollbar snap-y-mandatory"
      style={{ scrollSnapType: "y mandatory" }}
    >
      {items.map((item) => (
        <FeedItem key={item.id} item={item} />
      ))}

      {loading && <FeedSkeleton />}

      <div ref={sentinelRef} className="snap-start h-1 w-full" />
    </div>
  );
}
