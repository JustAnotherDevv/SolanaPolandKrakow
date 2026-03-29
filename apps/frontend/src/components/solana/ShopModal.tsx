import { useState } from 'react'
import { motion } from 'motion/react'
import { ShoppingBag, X } from 'lucide-react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TxStatus, type TxState } from './TxStatus'
import type { ShopItem, ShopPurchase } from '@/lib/sdk/types'

interface ShopModalProps {
  items: ShopItem[]
  onPurchase: (purchases: ShopPurchase[]) => void
  onClose: () => void
}

export function ShopModal({ items, onPurchase }: ShopModalProps) {
  const { publicKey, sendTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const [buying, setBuying] = useState<string | null>(null)
  const [txState, setTxState] = useState<TxState>('idle')
  const [error, setError] = useState<string>()
  const [purchased, setPurchased] = useState<ShopPurchase[]>([])

  async function handleBuy(item: ShopItem) {
    if (!publicKey) {
      setVisible(true)
      return
    }

    try {
      setBuying(item.id)
      setTxState('signing')
      setError(undefined)

      const lamports = Math.round(item.priceSol * LAMPORTS_PER_SOL)
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey('11111111111111111111111111111111'),
          lamports,
        }),
      )

      const sig = await sendTransaction(tx, connection)
      setTxState('confirming')
      await connection.confirmTransaction(sig, 'confirmed')
      setTxState('success')

      const purchase: ShopPurchase = { itemId: item.id, txSig: sig }
      setPurchased((prev) => [...prev, purchase])

      setTimeout(() => {
        setBuying(null)
        setTxState('idle')
      }, 1000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('User rejected') ? 'Cancelled' : msg)
      setTxState('error')
      setTimeout(() => { setBuying(null); setTxState('idle') }, 2000)
    }
  }

  function handleDone() {
    onPurchase(purchased)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl p-5 max-w-md w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" />
            <h3 className="text-sm font-medium text-white">Item Shop</h3>
          </div>
          <button onClick={handleDone} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} className="text-white/40" />
          </button>
        </div>

        {!connected && (
          <button
            onClick={() => setVisible(true)}
            className="w-full py-2 mb-3 rounded-xl border border-primary/30 text-xs text-primary hover:bg-primary/10 transition-all"
          >
            Connect Wallet to Buy
          </button>
        )}

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
          {items.map((item) => {
            const owned = purchased.some((p) => p.itemId === item.id)
            const isBuying = buying === item.id

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
              >
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                    {item.category === 'weapon' ? '⚔️' : item.category === 'armor' ? '🛡️' : '📦'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-white/40 truncate">{item.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-bold text-[#14F195]">{item.priceSol} SOL</p>
                  {owned ? (
                    <span className="text-[9px] text-[#14F195]/70">Owned</span>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={isBuying || !connected}
                      className="text-[9px] text-primary hover:text-primary/80 disabled:text-white/20 transition-colors"
                    >
                      {isBuying ? 'Buying...' : 'Buy'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {buying && <TxStatus state={txState} error={error} />}

        {/* Done button */}
        {purchased.length > 0 && (
          <button
            onClick={handleDone}
            className="w-full mt-3 py-2.5 rounded-xl bg-primary text-black text-xs font-medium hover:bg-primary/80 transition-all"
          >
            Continue with {purchased.length} item{purchased.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </motion.div>
  )
}
