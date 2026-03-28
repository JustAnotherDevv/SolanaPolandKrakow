import type { ComponentType } from 'react'
import type { GameSDK } from '@/lib/sdk/GameSDK'

export interface GameComponentProps {
  sdk: GameSDK
  width: number
  height: number
}

type GameComponentModule = {
  default?: ComponentType<GameComponentProps>
  [key: string]: ComponentType<GameComponentProps> | undefined
}

const GAME_MAP: Record<string, () => Promise<GameComponentModule>> = {
  'sol-flap': () => import('./SolFlap/index') as Promise<GameComponentModule>,
  'crypto-breaker': () => import('./CryptoBreaker/index') as Promise<GameComponentModule>,
  'hash-runner': () => import('./HashRunner/index') as Promise<GameComponentModule>,
  'block-blitz': () => import('./BlockBlitz/index') as Promise<GameComponentModule>,
}

export function hasGame(slug: string): boolean {
  return slug.startsWith('ai-') || slug in GAME_MAP
}

export async function loadGame(slug: string): Promise<ComponentType<GameComponentProps> | null> {
  // AI-generated games: slug = "ai-<gameId>"
  if (slug.startsWith('ai-')) {
    const gameId = slug.slice(3)
    const mod = await import('@/components/creator/AiGameCanvas')
    // Return a wrapper component that passes gameId
    const AiGameCanvas = mod.AiGameCanvas
    const Wrapper: ComponentType<GameComponentProps> = (props) =>
      AiGameCanvas({ ...props, gameId })
    return Wrapper
  }

  const loader = GAME_MAP[slug]
  if (!loader) return null
  const mod = await loader()
  // Named export matches PascalCase of slug: sol-flap → SolFlap
  const name = slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
  return (mod[name] ?? mod.default) ?? null
}
