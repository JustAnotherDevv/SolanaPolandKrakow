import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '@/lib/anchor/client'
import type { ScoreEntry } from '@/lib/anchor/client'
import type { FeedGame } from '@/lib/mockData'

const MOCK_ENTRIES: ScoreEntry[] = [
  { player: '7xKXmF3qsolana11111111', score: 142, timestamp: Date.now() - 3600 },
  { player: '3rPQnZ8wcrypto11111111', score: 98, timestamp: Date.now() - 7200 },
  { player: '9mWEkL2snftpunk111111', score: 87, timestamp: Date.now() - 10800 },
  { player: '5tRYpQ4vdefianon11111', score: 73, timestamp: Date.now() - 14400 },
  { player: '2xFGhJKLmnopqrst11111', score: 61, timestamp: Date.now() - 18000 },
]

export function useLeaderboard(game: FeedGame) {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [liveEntries, setLiveEntries] = useState<ScoreEntry[] | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', game.leaderboardAddress],
    queryFn: () => fetchLeaderboard(connection, game.leaderboardAddress),
    staleTime: 5000,
  })

  // Real-time subscription to leaderboard account changes
  useEffect(() => {
    if (game.leaderboardAddress === '11111111111111111111111111111111') return
    let subId: number
    try {
      const pubkey = new PublicKey(game.leaderboardAddress)
      subId = connection.onAccountChange(pubkey, () => {
        fetchLeaderboard(connection, game.leaderboardAddress).then((d) => {
          if (d) setLiveEntries(d.entries)
        })
      })
    } catch {
      // Invalid address — program not deployed yet
    }
    return () => {
      if (subId !== undefined) connection.removeAccountChangeListener(subId)
    }
  }, [connection, game.leaderboardAddress])

  const entries = liveEntries ?? data?.entries ?? MOCK_ENTRIES

  const userRank = publicKey
    ? entries.findIndex((e) => e.player === publicKey.toBase58()) + 1
    : 0

  return { entries, loading: isLoading, userRank }
}
