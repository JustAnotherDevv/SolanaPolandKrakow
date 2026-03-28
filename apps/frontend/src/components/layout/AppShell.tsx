import { useState } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { FeedPage } from "@/pages/FeedPage";
import { ProfilePage } from "@/pages/ProfilePage";

type Page = "feed" | "profile";

export function AppShell() {
  const [activePage, setActivePage] = useState<Page>("feed");

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <TopBar />

      <main className="h-full pt-11 pb-14 overflow-hidden">
        {activePage === "feed" && <FeedPage />}
        {activePage === "profile" && <ProfilePage />}
      </main>

      <BottomNav activePage={activePage} onNavigate={setActivePage} />
    </div>
  );
}
