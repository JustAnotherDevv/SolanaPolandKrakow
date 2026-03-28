import type { GameSDKCallbacks } from './types'

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

  get score(): number {
    return this._score
  }

  get gameId(): string {
    return this._gameId
  }
}
