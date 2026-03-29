import { useState } from 'react'
import { motion } from 'motion/react'
import { Wallet, Zap } from 'lucide-react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TxStatus, type TxState } from './TxStatus'

interface PaymentGateProps {
  amountSol: number
  recipient?: string
  onSuccess: (txSig: string) => void
  onCancel: () => void
}

export function PaymentGate({ amountSol, recipient, onSuccess, onCancel }: PaymentGateProps) {
  const { publicKey, sendTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const [txState, setTxState] = useState<TxState>('idle')
  const [txSig, setTxSig] = useState<string>()
  const [error, setError] = useState<string>()

  async function handlePay() {
    if (!publicKey) {
      setVisible(true)
      return
    }

    try {
      setTxState('signing')
      setError(undefined)

      const lamports = Math.round(amountSol * LAMPORTS_PER_SOL)
      // Default recipient is a dummy treasury — games can override
      const toPubkey = new PublicKey(recipient || '11111111111111111111111111111111')

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey,
          lamports,
        }),
      )

      const sig = await sendTransaction(tx, connection)
      setTxState('confirming')
      setTxSig(sig)

      await connection.confirmTransaction(sig, 'confirmed')
      setTxState('success')

      // Small delay so user sees the success state
      setTimeout(() => onSuccess(sig), 800)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('User rejected') ? 'Transaction cancelled' : msg)
      setTxState('error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Zap size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Payment Required</h3>
            <p className="text-xs text-white/40">Pay to unlock this game</p>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-white/5 rounded-xl p-4 mb-4 text-center">
          <p className="text-3xl font-bold text-white">{amountSol} SOL</p>
          <p className="text-xs text-white/30 mt-1">Solana Devnet</p>
        </div>

        {/* Wallet status */}
        {!connected && (
          <p className="text-xs text-yellow-400/70 mb-3 flex items-center gap-1.5">
            <Wallet size={12} />
            Connect your wallet to continue
          </p>
        )}

        <TxStatus state={txState} txSig={txSig} error={error} />

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            disabled={txState === 'signing' || txState === 'confirming'}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white/80 hover:border-white/20 transition-all disabled:opacity-30"
          >
            Cancel
          </button>
          <button
            onClick={handlePay}
            disabled={txState === 'signing' || txState === 'confirming' || txState === 'success'}
            className="flex-1 py-2.5 rounded-xl bg-primary text-black text-xs font-medium hover:bg-primary/80 transition-all disabled:opacity-50"
          >
            {!connected ? 'Connect Wallet' : txState === 'idle' || txState === 'error' ? `Pay ${amountSol} SOL` : 'Processing...'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
