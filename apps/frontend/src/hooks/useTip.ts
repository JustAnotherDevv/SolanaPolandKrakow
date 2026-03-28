import { useState, useCallback } from 'react'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { useUserStore } from '@/stores/userStore'
import { tipSol } from '@/lib/anchor/client'

type TipStatus = 'idle' | 'pending' | 'success' | 'error'

export function useTip(creatorAddress: string) {
  const [status, setStatus] = useState<TipStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const wallet = useAnchorWallet()
  const { connection } = useConnection()
  const { recordTip } = useUserStore()

  const tip = useCallback(
    async (lamports: number) => {
      if (!wallet) {
        setError('Wallet not connected')
        return
      }
      setError(null)
      setStatus('pending')
      try {
        await tipSol(connection, wallet, creatorAddress, lamports)
        recordTip(lamports / 1e9)
        setStatus('success')
        setTimeout(() => setStatus('idle'), 2500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Tip failed')
        setStatus('error')
        setTimeout(() => setStatus('idle'), 3000)
      }
    },
    [wallet, connection, creatorAddress, recordTip],
  )

  return { tip, status, error }
}
