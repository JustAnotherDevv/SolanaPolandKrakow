import { motion } from 'motion/react'
import { PublishForm } from '@/components/publish/PublishForm'

export function PublishPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-auto no-scrollbar"
    >
      <div className="px-5 pt-5 pb-2 border-b border-border">
        <h1 className="text-base font-light text-foreground">Publish a Game</h1>
        <p className="text-xs font-light text-muted-foreground mt-0.5">
          Deploy your game to the Solana GameFeed
        </p>
      </div>
      <PublishForm />
    </motion.div>
  )
}
