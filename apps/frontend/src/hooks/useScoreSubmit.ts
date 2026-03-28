import { useState, useCallback } from 'react'
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import { useGameStore } from '@/stores/gameStore'
import { useUserStore } from '@/stores/userStore'
import { commitScore, revealScore, claimReward } from '@/lib/anchor/client'
import type { FeedGame } from '@/lib/mockData'

type SubmitStatus = 'idle' | 'committing' | 'revealing' | 'claiming' | 'done' | 'error'

/**
 * Commit-reveal anti-cheat flow:
 * 1. Generate random 32-byte nonce
 * 2. Hash = SHA256(score_le || nonce) via WebCrypto
 * 3. commit_score tx → leaderboard program
 * 4. reveal_score tx (verifies hash on-chain, inserts score)
 * 5. If score ≥ bronze threshold: claim_reward tx
 */
export function useScoreSubmit(game: FeedGame) {
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const { publicKey } = useWallet()
  const { score } = useGameStore()
  const { markSubmitted, gameHistory } = useUserStore()

  const submit = useCallback(async () => {
    if (!wallet || !publicKey) {
      setError('Wallet not connected')
      return
    }
    setError(null)

    try {
      const finalScore = score
      const gameIdBig = BigInt(game.id)

      // Generate nonce
      const nonce = crypto.getRandomValues(new Uint8Array(32))

      // Hash = SHA256(score as 8-byte LE || nonce)
      const scoreBuf = new ArrayBuffer(8)
      new DataView(scoreBuf).setBigUint64(0, BigInt(finalScore), true)
      const hashBuf = await crypto.subtle.digest(
        'SHA-256',
        new Uint8Array([...new Uint8Array(scoreBuf), ...nonce]),
      )
      const commitmentHash = new Uint8Array(hashBuf)

      // Step 1: commit
      setStatus('committing')
      await commitScore(connection, wallet, gameIdBig, commitmentHash)

      // Step 2: reveal
      setStatus('revealing')
      await revealScore(connection, wallet, gameIdBig, BigInt(finalScore), nonce)

      // Step 3: claim reward if eligible
      if (finalScore >= game.bronzeScore) {
        setStatus('claiming')
        await claimReward(connection, wallet, gameIdBig, BigInt(finalScore))
      }

      // Mark submitted in user history
      const entry = gameHistory.find((e) => e.gameId === game.id && !e.submitted)
      if (entry) markSubmitted(game.id, entry.timestamp)

      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
      setStatus('error')
    }
  }, [wallet, publicKey, connection, score, game, gameHistory, markSubmitted])

  return { submit, status, error }
}
