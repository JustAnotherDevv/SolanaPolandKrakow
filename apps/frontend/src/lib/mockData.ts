export interface Creator {
  name: string
  address: string
  avatarColor: string
  initials: string
}

export interface FeedGame {
  id: string
  slug: string
  name: string
  description: string
  creator: Creator
  tags: string[]
  playCount: number
  totalTips: number
  bgColor: string
  bgColor2: string
  // On-chain addresses (localnet/devnet)
  leaderboardAddress: string
  tipJarAddress: string
  rewardMintAddress: string
  // Reward thresholds for UI display
  bronzeScore: number
  silverScore: number
  goldScore: number
}

export interface ActivityItem {
  id: string
  title: string
  creator: string
  timestamp: string
  bgColor: string
}

const creators: Creator[] = [
  { name: '0xsolana', address: '7xKX...mF3q', avatarColor: '#9945FF', initials: '0X' },
  { name: 'cryptovibe', address: '3rPQ...nZ8w', avatarColor: '#14F195', initials: 'CV' },
  { name: 'nft.punk', address: '9mWE...kL2s', avatarColor: '#FF6B6B', initials: 'NP' },
  { name: 'defi_anon', address: '5tRY...pQ4v', avatarColor: '#FFD93D', initials: 'DA' },
]

// Placeholder pubkeys for localnet (replace after anchor build)
const PLACEHOLDER_LB = '11111111111111111111111111111111'
const PLACEHOLDER_TJ = '11111111111111111111111111111111'
const PLACEHOLDER_RM = '11111111111111111111111111111111'

export const BUILT_IN_GAMES: FeedGame[] = [
  {
    id: '1',
    slug: 'sol-flap',
    name: 'SolFlap',
    description: 'Navigate your Solana bird through the blockchain pipes. How many blocks can you clear?',
    creator: creators[0],
    tags: ['arcade', 'solana', 'flap'],
    playCount: 48291,
    totalTips: 12.4,
    bgColor: '#000000',
    bgColor2: '#1a0a2e',
    leaderboardAddress: PLACEHOLDER_LB,
    tipJarAddress: PLACEHOLDER_TJ,
    rewardMintAddress: PLACEHOLDER_RM,
    bronzeScore: 5,
    silverScore: 20,
    goldScore: 50,
  },
  {
    id: '2',
    slug: 'crypto-breaker',
    name: 'CryptoBreaker',
    description: 'Destroy crypto bricks with your wallet paddle. Power-ups unlock on-chain rewards.',
    creator: creators[1],
    tags: ['breakout', 'defi', 'retro'],
    playCount: 31547,
    totalTips: 8.9,
    bgColor: '#000000',
    bgColor2: '#0a1a2e',
    leaderboardAddress: PLACEHOLDER_LB,
    tipJarAddress: PLACEHOLDER_TJ,
    rewardMintAddress: PLACEHOLDER_RM,
    bronzeScore: 100,
    silverScore: 500,
    goldScore: 1500,
  },
  {
    id: '3',
    slug: 'hash-runner',
    name: 'HashRunner',
    description: 'Sprint through the mempool — dodge failed transactions and ride validator waves.',
    creator: creators[2],
    tags: ['runner', 'endless', 'mempool'],
    playCount: 22890,
    totalTips: 5.3,
    bgColor: '#000000',
    bgColor2: '#1a2e0a',
    leaderboardAddress: PLACEHOLDER_LB,
    tipJarAddress: PLACEHOLDER_TJ,
    rewardMintAddress: PLACEHOLDER_RM,
    bronzeScore: 10,
    silverScore: 30,
    goldScore: 60,
  },
  {
    id: '4',
    slug: 'block-blitz',
    name: 'BlockBlitz',
    description: 'Stack blocks faster than a Solana validator. Clear lines, earn tokens, beat the leaderboard.',
    creator: creators[3],
    tags: ['puzzle', 'tetris', 'strategy'],
    playCount: 18643,
    totalTips: 7.1,
    bgColor: '#000000',
    bgColor2: '#2e0a1a',
    leaderboardAddress: PLACEHOLDER_LB,
    tipJarAddress: PLACEHOLDER_TJ,
    rewardMintAddress: PLACEHOLDER_RM,
    bronzeScore: 200,
    silverScore: 800,
    goldScore: 2000,
  },
]

export const initialFeedGames: FeedGame[] = [...BUILT_IN_GAMES]

export function generateMoreGames(startIndex: number, count = 4): FeedGame[] {
  return Array.from({ length: count }, (_, i) => ({
    ...BUILT_IN_GAMES[(startIndex + i) % BUILT_IN_GAMES.length],
    id: `${startIndex + i + 1}-${Date.now()}`,
    playCount: Math.floor(Math.random() * 50000) + 5000,
  }))
}

export const mockLikedItems: ActivityItem[] = [
  { id: 'l1', title: 'SolFlap', creator: '0xsolana', timestamp: '2m ago', bgColor: '#9945FF' },
  { id: 'l2', title: 'CryptoBreaker', creator: 'cryptovibe', timestamp: '1h ago', bgColor: '#14F195' },
  { id: 'l3', title: 'HashRunner', creator: 'nft.punk', timestamp: '3h ago', bgColor: '#FF6B6B' },
  { id: 'l4', title: 'BlockBlitz', creator: 'defi_anon', timestamp: '1d ago', bgColor: '#FFD93D' },
  { id: 'l5', title: 'SolFlap', creator: '0xsolana', timestamp: '2d ago', bgColor: '#9945FF' },
  { id: 'l6', title: 'CryptoBreaker', creator: 'cryptovibe', timestamp: '4d ago', bgColor: '#14F195' },
]

export const mockHistoryItems: ActivityItem[] = [
  { id: 'h1', title: 'BlockBlitz', creator: 'defi_anon', timestamp: 'just now', bgColor: '#FFD93D' },
  { id: 'h2', title: 'HashRunner', creator: 'nft.punk', timestamp: '5m ago', bgColor: '#FF6B6B' },
  { id: 'h3', title: 'SolFlap', creator: '0xsolana', timestamp: '12m ago', bgColor: '#9945FF' },
  { id: 'h4', title: 'CryptoBreaker', creator: 'cryptovibe', timestamp: '30m ago', bgColor: '#14F195' },
  { id: 'h5', title: 'BlockBlitz', creator: 'defi_anon', timestamp: '2h ago', bgColor: '#FFD93D' },
  { id: 'h6', title: 'HashRunner', creator: 'nft.punk', timestamp: '4h ago', bgColor: '#FF6B6B' },
  { id: 'h7', title: 'SolFlap', creator: '0xsolana', timestamp: '1d ago', bgColor: '#9945FF' },
  { id: 'h8', title: 'CryptoBreaker', creator: 'cryptovibe', timestamp: '2d ago', bgColor: '#14F195' },
]
