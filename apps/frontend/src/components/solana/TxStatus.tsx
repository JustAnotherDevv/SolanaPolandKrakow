import { motion } from 'motion/react'
import { Check, X, Loader2 } from 'lucide-react'

export type TxState = 'idle' | 'signing' | 'confirming' | 'success' | 'error'

interface TxStatusProps {
  state: TxState
  txSig?: string
  error?: string
}

export function TxStatus({ state, txSig, error }: TxStatusProps) {
  if (state === 'idle') return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-xs font-light mt-3"
    >
      {state === 'signing' && (
        <>
          <Loader2 size={14} className="animate-spin text-primary" />
          <span className="text-white/60">Waiting for wallet signature...</span>
        </>
      )}
      {state === 'confirming' && (
        <>
          <Loader2 size={14} className="animate-spin text-[#14F195]" />
          <span className="text-white/60">Confirming transaction...</span>
        </>
      )}
      {state === 'success' && (
        <>
          <Check size={14} className="text-[#14F195]" />
          <span className="text-[#14F195]">Confirmed!</span>
          {txSig && (
            <a
              href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary/60 hover:text-primary underline ml-1"
            >
              View
            </a>
          )}
        </>
      )}
      {state === 'error' && (
        <>
          <X size={14} className="text-red-400" />
          <span className="text-red-400/80">{error || 'Transaction failed'}</span>
        </>
      )}
    </motion.div>
  )
}
