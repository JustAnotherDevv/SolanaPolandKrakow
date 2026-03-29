import { useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TxStatus, type TxState } from './TxStatus'
import type { NFTMetadata } from '@/lib/sdk/types'

interface MintModalProps {
  metadata: NFTMetadata
  onSuccess: (mintAddress: string) => void
  onCancel: () => void
}

export function MintModal({ metadata, onSuccess, onCancel }: MintModalProps) {
  const { publicKey, sendTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const [txState, setTxState] = useState<TxState>('idle')
  const [txSig, setTxSig] = useState<string>()
  const [error, setError] = useState<string>()

  async function handleMint() {
    if (!publicKey) {
      setVisible(true)
      return
    }

    try {
      setTxState('signing')
      setError(undefined)

      // Simplified mint: SOL transfer as proof-of-mint (real Metaplex integration for production)
      const mintFee = 0.01 * LAMPORTS_PER_SOL
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey, // self-transfer as placeholder
          lamports: mintFee,
        }),
      )

      const sig = await sendTransaction(tx, connection)
      setTxState('confirming')
      setTxSig(sig)

      await connection.confirmTransaction(sig, 'confirmed')
      setTxState('success')

      // Use tx sig as pseudo mint address for hackathon
      setTimeout(() => onSuccess(sig), 1000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('User rejected') ? 'Cancelled' : msg)
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
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Sparkles size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Mint NFT</h3>
            <p className="text-xs text-white/40">Claim your achievement</p>
          </div>
        </div>

        {/* NFT Preview */}
        <div className="bg-white/5 rounded-xl p-4 mb-4">
          {metadata.image && (
            <img
              src={metadata.image}
              alt={metadata.name}
              className="w-full h-40 object-cover rounded-lg mb-3"
            />
          )}
          <p className="text-sm font-medium text-white">{metadata.name}</p>
          <p className="text-xs text-white/40 mt-1">{metadata.description}</p>
          {metadata.attributes && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(metadata.attributes).map(([key, val]) => (
                <span key={key} className="px-2 py-0.5 rounded-full bg-purple-500/10 text-[9px] text-purple-300">
                  {key}: {val}
                </span>
              ))}
            </div>
          )}
        </div>

        <TxStatus state={txState} txSig={txSig} error={error} />

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            disabled={txState === 'signing' || txState === 'confirming'}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white/80 transition-all disabled:opacity-30"
          >
            Skip
          </button>
          <button
            onClick={handleMint}
            disabled={txState === 'signing' || txState === 'confirming' || txState === 'success'}
            className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-medium hover:bg-purple-500/80 transition-all disabled:opacity-50"
          >
            {!connected ? 'Connect Wallet' : txState === 'idle' || txState === 'error' ? 'Mint NFT' : 'Minting...'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
