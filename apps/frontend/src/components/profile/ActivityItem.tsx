import { motion } from "motion/react";
import { Separator } from "@/components/ui/separator";
import type { ActivityItem as ActivityItemType } from "@/lib/mockData";

interface ActivityItemProps {
  item: ActivityItemType;
  index: number;
  isLast: boolean;
}

export function ActivityItem({ item, index, isLast }: ActivityItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
    >
      <div className="flex items-center gap-3 px-5 py-3.5">
        {/* Color swatch */}
        <div
          className="w-6 h-6 rounded flex-shrink-0"
          style={{ backgroundColor: item.bgColor + "40", border: `1px solid ${item.bgColor}50` }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-light text-foreground truncate leading-snug">
            {item.title}
          </p>
          <p className="text-[11px] font-light text-muted-foreground mt-0.5">
            @{item.creator}
          </p>
        </div>

        {/* Timestamp */}
        <span className="text-[11px] font-light text-muted-foreground flex-shrink-0 tabular-nums">
          {item.timestamp}
        </span>
      </div>
      {!isLast && <Separator className="mx-5 w-auto" />}
    </motion.div>
  );
}
