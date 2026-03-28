import { Skeleton } from '@/components/ui/skeleton'
import { useTokenBalances } from '@/hooks/useTokenBalances'
import { motion } from 'motion/react'

export function TokenBalances() {
  const { data: balances, isLoading } = useTokenBalances()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 px-5 py-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="w-24 h-4 rounded" />
            <Skeleton className="w-16 h-4 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!balances || balances.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-xs font-light text-muted-foreground">
          No game tokens yet. Play and hit reward tiers to earn!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {balances.map((token, i) => (
        <motion.div
          key={token.mint}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center justify-between px-5 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
              <span className="text-[9px] font-medium text-primary">{token.symbol}</span>
            </div>
            <div>
              <p className="text-xs font-light text-foreground">{token.gameName}</p>
              <p className="text-[10px] text-muted-foreground font-light">{token.symbol}</p>
            </div>
          </div>
          <span className="text-sm font-light tabular-nums text-foreground/80">
            {token.balance.toLocaleString()}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
