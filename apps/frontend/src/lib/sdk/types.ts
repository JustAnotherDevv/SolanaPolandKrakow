export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover' | 'submitting' | 'submitted'

// ─── Solana Types ────────────────────────────────────────────────────────────

export interface ShopItem {
  id: string
  name: string
  description: string
  priceSol: number
  image?: string
  category?: string
}

export interface ShopPurchase {
  itemId: string
  txSig: string
}

export interface NFTMetadata {
  name: string
  description: string
  image: string
  attributes?: Record<string, string>
}

export interface LeaderboardEntry {
  rank: number
  player: string
  score: number
  timestamp: number
}

// ─── SDK Callbacks ───────────────────────────────────────────────────────────

export interface GameSDKCallbacks {
  onScoreUpdate: (score: number) => void
  onGameEnd: (finalScore: number) => void
  onAchievement: (id: string, name: string) => void
  onLivesUpdate: (lives: number) => void
  // Solana callbacks — resolved by the React overlay layer
  onRequestPayment?: (amountSol: number, recipient?: string) => Promise<string>
  onShowShop?: (items: ShopItem[]) => Promise<ShopPurchase[]>
  onMintNFT?: (metadata: NFTMetadata) => Promise<string>
  onGetLeaderboard?: (gameId: string) => Promise<LeaderboardEntry[]>
  onSubmitScore?: (score: number) => Promise<string>
  onShowLeaderboard?: () => void
}

export interface GameInstance {
  start: () => void
  pause: () => void
  resume: () => void
  destroy: () => void
}
