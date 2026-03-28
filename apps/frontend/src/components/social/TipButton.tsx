import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Heart } from 'lucide-react'
import { useTip } from '@/hooks/useTip'

const AMOUNTS = [
  { label: '0.01', lamports: 10_000_000 },
  { label: '0.05', lamports: 50_000_000 },
  { label: '0.1', lamports: 100_000_000 },
]

interface TipButtonProps {
  creatorName: string
  creatorAddress: string
}

export function TipButton({ creatorName, creatorAddress }: TipButtonProps) {
  const [open, setOpen] = useState(false)
  const { tip, status } = useTip(creatorAddress)

  const isPending = status === 'pending'
  const isSuccess = status === 'success'

  return (
    <div className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-black/90 border border-white/10 rounded-xl p-3 flex gap-2"
          >
            {AMOUNTS.map((a) => (
              <button
                key={a.label}
                disabled={isPending}
                onClick={async () => {
                  await tip(a.lamports)
                  setOpen(false)
                }}
                className="flex-1 h-9 rounded-lg text-xs font-light text-white/70 border border-white/10 hover:border-white/30 hover:text-white transition-all"
              >
                {a.label} ◎
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full h-10 rounded-xl text-xs font-light flex items-center justify-center gap-1.5 border transition-all"
        style={{
          color: isSuccess ? '#FF6B6B' : 'rgba(255,255,255,0.4)',
          borderColor: isSuccess ? 'rgba(255,107,107,0.3)' : 'rgba(255,255,255,0.08)',
          background: isSuccess ? 'rgba(255,107,107,0.08)' : 'transparent',
        }}
      >
        <Heart size={11} fill={isSuccess ? '#FF6B6B' : 'none'} />
        {isSuccess ? 'Tipped!' : `Tip ${creatorName}`}
      </button>
    </div>
  )
}
