import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { BUILT_IN_GAMES } from '@/lib/mockData'
import { getRewardMintPDA } from '@/lib/anchor/pda'

export interface TokenBalance {
  gameId: string
  gameName: string
  symbol: string
  mint: string
  balance: number
}

async function fetchTokenBalances(
  connection: import('@solana/web3.js').Connection,
  owner: PublicKey,
): Promise<TokenBalance[]> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    })

    const mintToGame = new Map<string, (typeof BUILT_IN_GAMES)[0]>()
    for (const game of BUILT_IN_GAMES) {
      try {
        const [mint] = getRewardMintPDA(BigInt(game.id))
        mintToGame.set(mint.toBase58(), game)
      } catch {
        // skip
      }
    }

    const balances: TokenBalance[] = []
    for (const { account } of tokenAccounts.value) {
      const info = account.data.parsed?.info
      if (!info) continue
      const mintAddr = info.mint as string
      const game = mintToGame.get(mintAddr)
      if (!game) continue
      const amount = info.tokenAmount?.uiAmount ?? 0
      if (amount > 0) {
        balances.push({
          gameId: game.id,
          gameName: game.name,
          symbol: game.name.toUpperCase().slice(0, 4),
          mint: mintAddr,
          balance: amount,
        })
      }
    }
    return balances
  } catch {
    return []
  }
}

export function useTokenBalances() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()

  return useQuery({
    queryKey: ['tokenBalances', publicKey?.toBase58()],
    queryFn: () => (publicKey ? fetchTokenBalances(connection, publicKey) : []),
    enabled: !!publicKey,
    staleTime: 15_000,
  })
}
