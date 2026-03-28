import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { TopBar } from './TopBar'
import { BottomNav, type Page } from './BottomNav'
import { FeedPage } from '@/pages/FeedPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { CreatorPage } from '@/pages/CreatorPage'
import type { FeedGame } from '@/lib/mockData'

export function AppShell() {
  const [activePage, setActivePage] = useState<Page>('feed')
  const [leaderboardGame, setLeaderboardGame] = useState<FeedGame | undefined>(undefined)

  function handleLeaderboard(game: FeedGame) {
    setLeaderboardGame(game)
    setActivePage('leaderboard')
  }

  function handleNavigate(page: Page) {
    if (page !== 'leaderboard') setLeaderboardGame(undefined)
    setActivePage(page)
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <TopBar />

      <main className="h-full pt-11 pb-14 overflow-hidden">
        <AnimatePresence mode="wait">
          {activePage === 'feed' && (
            <div key="feed" className="h-full">
              <FeedPage onLeaderboard={handleLeaderboard} />
            </div>
          )}
          {activePage === 'leaderboard' && (
            <div key="leaderboard" className="h-full">
              <LeaderboardPage initialGame={leaderboardGame} />
            </div>
          )}
          {activePage === 'profile' && (
            <div key="profile" className="h-full">
              <ProfilePage />
            </div>
          )}
          {activePage === 'publish' && (
            <div key="publish" className="h-full">
              <CreatorPage />
            </div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav activePage={activePage} onNavigate={handleNavigate} />
    </div>
  )
}
