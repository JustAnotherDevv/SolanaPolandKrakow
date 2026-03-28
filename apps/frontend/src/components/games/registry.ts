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
  return slug in GAME_MAP
}

export async function loadGame(slug: string): Promise<ComponentType<GameComponentProps> | null> {
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
