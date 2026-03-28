import { useQuery } from '@tanstack/react-query'
import { useConnection } from '@solana/wallet-adapter-react'
import { BUILT_IN_GAMES } from '@/lib/mockData'
import type { FeedGame } from '@/lib/mockData'

/**
 * Returns the list of registered games.
 * Eventually fetches from game_registry program; currently returns mock data.
 */
export function useGameRegistry() {
  const { connection } = useConnection()

  return useQuery<FeedGame[]>({
    queryKey: ['gameRegistry'],
    queryFn: async () => {
      // TODO: fetch on-chain game entries after `anchor build` + IDL generation
      void connection
      return BUILT_IN_GAMES
    },
    staleTime: 60_000,
  })
}
