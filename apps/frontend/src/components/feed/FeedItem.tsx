import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ActionSidebar } from "./ActionSidebar";
import type { FeedItem as FeedItemType } from "@/lib/mockData";

interface FeedItemProps {
  item: FeedItemType;
}

export function FeedItem({ item }: FeedItemProps) {
  return (
    <motion.div
      className="snap-start relative w-full flex-shrink-0 overflow-hidden"
      style={{ height: "100%" }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, margin: "-10%" }}
      transition={{ duration: 0.25 }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 30% 40%, ${item.bgColor2} 0%, ${item.bgColor} 70%)`,
        }}
      />

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      {/* Bottom gradient overlay for legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 35%, transparent 60%)",
        }}
      />

      {/* Top gradient for TopBar legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%)",
        }}
      />

      {/* Right action sidebar */}
      <div className="absolute right-3 bottom-24 z-10">
        <ActionSidebar
          likes={item.likes}
          comments={item.comments}
          shares={item.shares}
        />
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-6 left-4 right-16 z-10">
        {/* Creator row */}
        <div className="flex items-center gap-2 mb-3">
          <Avatar className="w-7 h-7 border border-white/20">
            <AvatarFallback
              className="text-[10px] font-medium text-white"
              style={{ background: item.creator.avatarColor + "33", border: "none" }}
            >
              {item.creator.initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-light text-white/90 tracking-wide">
            @{item.creator.name}
          </span>
          <span className="text-[10px] font-light text-white/40 ml-1">
            {item.creator.address}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-base font-medium text-white leading-snug mb-1.5 tracking-tight">
          {item.title}
        </h2>

        {/* Description */}
        <p className="text-xs font-light text-white/60 leading-relaxed mb-3 line-clamp-2">
          {item.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[10px] font-light border-white/15 text-white/50 px-2 py-0 h-5 rounded-full hover:bg-transparent"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
