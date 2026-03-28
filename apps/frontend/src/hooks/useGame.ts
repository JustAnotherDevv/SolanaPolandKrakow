import { useMemo } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useUserStore } from '@/stores/userStore'
import { GameSDK } from '@/lib/sdk/GameSDK'
import type { FeedGame } from '@/lib/mockData'

/**
 * Creates a stable GameSDK instance for a given game card.
 * Wires SDK callbacks → Zustand gameStore actions.
 */
export function useGame(game: FeedGame) {
  const { startGame, updateScore, updateLives, endGame } = useGameStore()
  const { recordPlay } = useUserStore()

  const sdk = useMemo(
    () =>
      new GameSDK(game.id, {
        onScoreUpdate: (score) => updateScore(score),
        onLivesUpdate: (lives) => updateLives(lives),
        onGameEnd: (finalScore) => {
          endGame(finalScore)
          recordPlay({
            gameId: game.id,
            gameName: game.name,
            score: finalScore,
            timestamp: Date.now(),
            submitted: false,
          })
        },
        onAchievement: (_id, _name) => {
          // future: toast notification
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.id],
  )

  function handlePlayStart() {
    startGame(game.id)
  }

  return { sdk, handlePlayStart }
}
