import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ActionSidebarProps {
  likes: number;
  comments: number;
  shares: number;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function ActionSidebar({ likes, comments, shares }: ActionSidebarProps) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  function handleLike() {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Like */}
      <motion.button
        className="flex flex-col items-center gap-1"
        whileTap={{ scale: 0.8 }}
        onClick={handleLike}
        aria-label="Like"
      >
        <div className="relative w-9 h-9 flex items-center justify-center">
          <AnimatePresence>
            {liked && (
              <motion.div
                key="burst"
                className="absolute inset-0 rounded-full bg-primary/20"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              />
            )}
          </AnimatePresence>
          <Heart
            size={22}
            strokeWidth={1.25}
            fill={liked ? "hsl(var(--primary))" : "transparent"}
            color={liked ? "hsl(var(--primary))" : "rgba(255,255,255,0.9)"}
          />
        </div>
        <span className="text-[10px] font-light text-white/70 tabular-nums">
          {formatCount(likeCount)}
        </span>
      </motion.button>

      {/* Comment */}
      <motion.button
        className="flex flex-col items-center gap-1"
        whileTap={{ scale: 0.8 }}
        aria-label="Comment"
      >
        <div className="w-9 h-9 flex items-center justify-center">
          <MessageCircle size={22} strokeWidth={1.25} color="rgba(255,255,255,0.9)" />
        </div>
        <span className="text-[10px] font-light text-white/70 tabular-nums">
          {formatCount(comments)}
        </span>
      </motion.button>

      {/* Share */}
      <motion.button
        className="flex flex-col items-center gap-1"
        whileTap={{ scale: 0.8 }}
        aria-label="Share"
      >
        <div className="w-9 h-9 flex items-center justify-center">
          <Share2 size={22} strokeWidth={1.25} color="rgba(255,255,255,0.9)" />
        </div>
        <span className="text-[10px] font-light text-white/70 tabular-nums">
          {formatCount(shares)}
        </span>
      </motion.button>

      {/* Bookmark */}
      <motion.button
        className="flex flex-col items-center gap-1"
        whileTap={{ scale: 0.8 }}
        onClick={() => setBookmarked((p) => !p)}
        aria-label="Bookmark"
      >
        <div className="w-9 h-9 flex items-center justify-center">
          <Bookmark
            size={22}
            strokeWidth={1.25}
            fill={bookmarked ? "rgba(255,255,255,0.9)" : "transparent"}
            color="rgba(255,255,255,0.9)"
          />
        </div>
      </motion.button>
    </div>
  );
}
