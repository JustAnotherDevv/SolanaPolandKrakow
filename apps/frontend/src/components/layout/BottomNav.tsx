import { Home, User } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Page = "feed" | "profile";

interface BottomNavProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const tabs: { id: Page; icon: typeof Home; label: string }[] = [
  { id: "feed", icon: Home, label: "Feed" },
  { id: "profile", icon: User, label: "Profile" },
];

export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-14 flex items-center border-t border-border bg-background/80 backdrop-blur-md safe-area-bottom">
      {tabs.map(({ id, icon: Icon, label }) => {
        const isActive = activePage === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 h-full min-w-[48px] transition-opacity",
              isActive ? "opacity-100" : "opacity-40 hover:opacity-60"
            )}
            aria-label={label}
          >
            <div className="relative flex items-center justify-center">
              <Icon
                size={20}
                strokeWidth={isActive ? 1.5 : 1.25}
                color={isActive ? "hsl(var(--primary))" : "hsl(var(--foreground))"}
              />
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-2 w-1 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </div>
            <span
              className="text-[9px] font-light tracking-wider uppercase"
              style={{ color: isActive ? "hsl(var(--primary))" : undefined }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
