import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityItem } from "./ActivityItem";
import { mockLikedItems, mockHistoryItems } from "@/lib/mockData";

export function ActivityTabs() {
  return (
    <Tabs defaultValue="liked" className="flex-1">
      <TabsList className="w-full rounded-none border-b border-border bg-transparent h-10 px-5 justify-start gap-6 p-0">
        <TabsTrigger
          value="liked"
          className="relative px-0 h-full rounded-none bg-transparent text-xs font-light tracking-wider uppercase text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none border-0 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-foreground after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200"
        >
          Liked
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="relative px-0 h-full rounded-none bg-transparent text-xs font-light tracking-wider uppercase text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none border-0 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-foreground after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200"
        >
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="liked" className="mt-0 pb-4">
        {mockLikedItems.map((item, i) => (
          <ActivityItem
            key={item.id}
            item={item}
            index={i}
            isLast={i === mockLikedItems.length - 1}
          />
        ))}
      </TabsContent>

      <TabsContent value="history" className="mt-0 pb-4">
        {mockHistoryItems.map((item, i) => (
          <ActivityItem
            key={item.id}
            item={item}
            index={i}
            isLast={i === mockHistoryItems.length - 1}
          />
        ))}
      </TabsContent>
    </Tabs>
  );
}
