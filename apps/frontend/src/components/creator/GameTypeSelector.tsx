import { motion } from 'motion/react'
import { Monitor, Box } from 'lucide-react'
import { useCreatorStore } from '@/stores/creatorStore'

interface GameTypeSelectorProps {
  onSelect: (type: '2d' | '3d') => void
}

export function GameTypeSelector({ onSelect }: GameTypeSelectorProps) {
  const setGameType = useCreatorStore((s) => s.setGameType)

  function handleSelect(type: '2d' | '3d') {
    setGameType(type)
    onSelect(type)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center h-full px-6 gap-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-xl font-light text-foreground tracking-tight">Choose Game Type</h2>
        <p className="text-xs font-light text-muted-foreground">
          Select the type of game you want to create
        </p>
      </div>

      <div className="flex gap-4 w-full max-w-sm">
        {/* 2D Card */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelect('2d')}
          className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
            <Monitor size={22} className="text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">2D Games</p>
            <p className="text-[10px] font-light text-muted-foreground mt-0.5">Canvas-powered</p>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-primary/20 text-[9px] font-medium text-primary uppercase tracking-wider">
            Available
          </div>
        </motion.button>

        {/* 3D Card */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelect('3d')}
          className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border border-[#9945FF]/30 bg-[#9945FF]/5 hover:bg-[#9945FF]/10 hover:border-[#9945FF]/60 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-[#9945FF]/15 flex items-center justify-center">
            <Box size={22} className="text-[#9945FF]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">3D Games</p>
            <p className="text-[10px] font-light text-muted-foreground mt-0.5">Three.js + AI scene</p>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-[#9945FF]/20 text-[9px] font-medium text-[#9945FF] uppercase tracking-wider">
            New
          </div>
        </motion.button>
      </div>

      <p className="text-[10px] text-muted-foreground/60 font-light max-w-xs text-center">
        Describe your game idea in plain language — AI will generate working code instantly
      </p>
    </motion.div>
  )
}
