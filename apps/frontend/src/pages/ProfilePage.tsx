import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ActivityTabs } from "@/components/profile/ActivityTabs";

export function ProfilePage() {
  return (
    <div className="h-full overflow-y-auto no-scrollbar flex flex-col">
      <ProfileHeader />
      <ActivityTabs />
    </div>
  );
}
