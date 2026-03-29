import type { GameSDKCallbacks, ShopItem, ShopPurchase, NFTMetadata, LeaderboardEntry } from './types'

/**
 * GameSDK — bridge between Canvas game classes and the React/Solana layer.
 * Games never import wallet or chain code. They only call these methods.
 */
export class GameSDK {
  private _gameId: string
  private callbacks: GameSDKCallbacks
  private _score = 0
  private _isRunning = false

  constructor(gameId: string, callbacks: GameSDKCallbacks) {
    this._gameId = gameId
    this.callbacks = callbacks
  }

  /** Game calls this when active gameplay begins (not on pause/resume) */
  gameplayStart(): void {
    this._score = 0
    this._isRunning = true
  }

  /** Game calls this each time the score changes */
  updateScore(newScore: number): void {
    if (!this._isRunning) return
    this._score = newScore
    this.callbacks.onScoreUpdate(newScore)
  }

  /** Game calls this when a life is lost */
  updateLives(lives: number): void {
    this.callbacks.onLivesUpdate(lives)
  }

  /** Game calls this on death / level completion */
  endGame(finalScore: number): void {
    this._isRunning = false
    this._score = finalScore
    this.callbacks.onGameEnd(finalScore)
  }

  /** Game calls this when an achievement is unlocked */
  achievement(id: string, name: string): void {
    this.callbacks.onAchievement(id, name)
  }

  // ─── Solana Methods ──────────────────────────────────────────────────────────

  /** Show payment modal — returns tx signature on success */
  async requestPayment(amountSol: number, recipient?: string): Promise<string> {
    if (!this.callbacks.onRequestPayment) throw new Error('Payments not available')
    return this.callbacks.onRequestPayment(amountSol, recipient)
  }

  /** Show item shop overlay — returns array of purchased items */
  async showShop(items: ShopItem[]): Promise<ShopPurchase[]> {
    if (!this.callbacks.onShowShop) throw new Error('Shop not available')
    return this.callbacks.onShowShop(items)
  }

  /** Mint an NFT for the player — returns mint address */
  async mintNFT(metadata: NFTMetadata): Promise<string> {
    if (!this.callbacks.onMintNFT) throw new Error('NFT minting not available')
    return this.callbacks.onMintNFT(metadata)
  }

  /** Fetch on-chain leaderboard entries */
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!this.callbacks.onGetLeaderboard) return []
    return this.callbacks.onGetLeaderboard(this._gameId)
  }

  /** Submit score on-chain (commit-reveal) — returns tx signature */
  async submitScore(score: number): Promise<string> {
    if (!this.callbacks.onSubmitScore) throw new Error('Score submission not available')
    return this.callbacks.onSubmitScore(score)
  }

  /** Show leaderboard overlay (fire-and-forget) */
  showLeaderboard(): void {
    this.callbacks.onShowLeaderboard?.()
  }

  get score(): number {
    return this._score
  }

  get gameId(): string {
    return this._gameId
  }
}
