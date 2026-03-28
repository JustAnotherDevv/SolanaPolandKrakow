import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityItem } from './ActivityItem'
import { GameHistoryList } from './GameHistoryList'
import { TokenBalances } from './TokenBalances'
import { mockLikedItems } from '@/lib/mockData'

const triggerClass =
  'relative px-0 h-full rounded-none bg-transparent text-xs font-light tracking-wider uppercase text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none border-0 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-foreground after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200'

export function ActivityTabs() {
  return (
    <Tabs defaultValue="history" className="flex-1">
      <TabsList className="w-full rounded-none border-b border-border bg-transparent h-10 px-5 justify-start gap-6">
        <TabsTrigger value="history" className={triggerClass}>
          History
        </TabsTrigger>
        <TabsTrigger value="tokens" className={triggerClass}>
          Tokens
        </TabsTrigger>
        <TabsTrigger value="liked" className={triggerClass}>
          Liked
        </TabsTrigger>
      </TabsList>

      <TabsContent value="history" className="mt-0 pb-4">
        <GameHistoryList />
      </TabsContent>

      <TabsContent value="tokens" className="mt-0 pb-4">
        <TokenBalances />
      </TabsContent>

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
    </Tabs>
  )
}
