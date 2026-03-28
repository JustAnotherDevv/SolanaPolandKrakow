import { Share2 } from 'lucide-react'
import type { FeedGame } from '@/lib/mockData'

interface ShareButtonProps {
  game: FeedGame
  score?: number
}

export function ShareButton({ game, score }: ShareButtonProps) {
  async function handleShare() {
    const text = score !== undefined
      ? `I scored ${score} on ${game.name}! Can you beat me? 🎮`
      : `Check out ${game.name} — ${game.description}`

    if (navigator.share) {
      await navigator.share({ title: game.name, text })
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-1.5 text-white/30 hover:text-white/60 transition-colors"
      aria-label="Share"
    >
      <Share2 size={16} strokeWidth={1.25} />
    </button>
  )
}
