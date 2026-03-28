export interface Creator {
  name: string;
  address: string;
  avatarColor: string;
  initials: string;
}

export interface FeedItem {
  id: string;
  creator: Creator;
  title: string;
  description: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  bgColor: string;
  bgColor2: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  creator: string;
  timestamp: string;
  bgColor: string;
}

const creators: Creator[] = [
  { name: "0xsolana", address: "7xKX...mF3q", avatarColor: "#9945FF", initials: "0X" },
  { name: "cryptovibe", address: "3rPQ...nZ8w", avatarColor: "#14F195", initials: "CV" },
  { name: "nft.punk", address: "9mWE...kL2s", avatarColor: "#FF6B6B", initials: "NP" },
  { name: "defi_anon", address: "5tRY...pQ4v", avatarColor: "#FFD93D", initials: "DA" },
  { name: "sol.maxi", address: "2uIO...jX7b", avatarColor: "#4ECDC4", initials: "SM" },
  { name: "web3.girl", address: "8pAS...nM9c", avatarColor: "#FF8B94", initials: "WG" },
];

const gradients: [string, string][] = [
  ["#0a0a0a", "#1a0a2e"],
  ["#0a0a0a", "#0a1a2e"],
  ["#0a0a0a", "#1a2e0a"],
  ["#0a0a0a", "#2e0a1a"],
  ["#0a0a0a", "#2e1a0a"],
  ["#0a0a0a", "#0a2e2e"],
  ["#0d0d0d", "#1a0d1a"],
  ["#0a0a0a", "#0a0a1a"],
];

const rawItems = [
  { title: "Solana Summer '25", description: "The fastest blockchain in the west. 65k TPS and only getting started.", tags: ["solana", "defi", "web3"] },
  { title: "NFT drop incoming", description: "Minting 1000 generative pieces on-chain. Floor price TBD.", tags: ["nft", "art", "mint"] },
  { title: "My DeFi portfolio", description: "Up 40% this month. Here's exactly what I'm holding and why.", tags: ["defi", "portfolio", "alpha"] },
  { title: "Anchor tutorial pt.1", description: "Building my first Solana program. The dev experience is actually insane.", tags: ["dev", "anchor", "solana"] },
  { title: "Phantom > MetaMask", description: "Switched to Phantom 6 months ago. Here's what I love about it.", tags: ["phantom", "wallet", "ux"] },
  { title: "Staking rewards 🔥", description: "Earning 7.2% APY staking SOL. Passive income hits different.", tags: ["staking", "passive", "sol"] },
  { title: "Compressed NFTs", description: "State compression changes everything. 1M NFTs for $50. No cap.", tags: ["cnft", "compression", "solana"] },
  { title: "On-chain art exhibit", description: "Curating the best generative art living permanently on Solana.", tags: ["art", "nft", "gallery"] },
  { title: "Helium migration", description: "Moving to Solana was the right call. IOT network is thriving.", tags: ["helium", "depin", "iot"] },
  { title: "Render Network vibes", description: "GPU rendering on-chain. The future of creative work is decentralized.", tags: ["render", "gpu", "depin"] },
  { title: "Mango Markets recap", description: "Governance vote passed. New features dropping next week.", tags: ["mango", "dao", "governance"] },
  { title: "Serum orderbook deep dive", description: "Understanding central limit order books on Solana. Thread.", tags: ["serum", "orderbook", "dex"] },
  { title: "Solana Mobile Chapter 2", description: "Just unboxed mine. Web3 native phone is actually the move.", tags: ["mobile", "chapter2", "hardware"] },
  { title: "Jupiter aggregator", description: "Best swap routes, period. Routing through 20+ DEXes simultaneously.", tags: ["jupiter", "dex", "swap"] },
  { title: "Saga token airdrop", description: "Holding Saga = free tokens. The distribution was surprisingly fair.", tags: ["saga", "airdrop", "mobile"] },
  { title: "Backpack wallet review", description: "xNFTs are a paradigm shift. Running dApps inside my wallet.", tags: ["backpack", "xnft", "wallet"] },
  { title: "Drift Protocol", description: "Perpetuals on Solana are finally here and they're smooth.", tags: ["drift", "perps", "trading"] },
  { title: "Metaplex deep dive", description: "Understanding token standards. Core vs. Token Metadata v3.", tags: ["metaplex", "nft", "standard"] },
  { title: "Firedancer node", description: "Jump's validator client will change Solana forever. Benchmarks are wild.", tags: ["firedancer", "validator", "infra"] },
  { title: "Pyth price feeds", description: "On-chain oracle data for 500+ assets. Latency under 400ms.", tags: ["pyth", "oracle", "data"] },
];

export const initialFeedItems: FeedItem[] = rawItems.slice(0, 10).map((item, i) => ({
  id: `feed-${i}`,
  creator: creators[i % creators.length],
  ...item,
  likes: Math.floor(Math.random() * 9000) + 500,
  comments: Math.floor(Math.random() * 500) + 20,
  shares: Math.floor(Math.random() * 200) + 10,
  bgColor: gradients[i % gradients.length][0],
  bgColor2: gradients[i % gradients.length][1],
}));

export function generateMoreItems(startIndex: number, count = 5): FeedItem[] {
  return rawItems.slice(startIndex % rawItems.length, (startIndex % rawItems.length) + count).map((item, i) => ({
    id: `feed-${startIndex + i}-${Date.now()}`,
    creator: creators[(startIndex + i) % creators.length],
    ...item,
    likes: Math.floor(Math.random() * 9000) + 500,
    comments: Math.floor(Math.random() * 500) + 20,
    shares: Math.floor(Math.random() * 200) + 10,
    bgColor: gradients[(startIndex + i) % gradients.length][0],
    bgColor2: gradients[(startIndex + i) % gradients.length][1],
  }));
}

export const mockLikedItems: ActivityItem[] = [
  { id: "l1", title: "Solana Summer '25", creator: "0xsolana", timestamp: "2m ago", bgColor: "#9945FF" },
  { id: "l2", title: "NFT drop incoming", creator: "nft.punk", timestamp: "1h ago", bgColor: "#FF6B6B" },
  { id: "l3", title: "Staking rewards 🔥", creator: "sol.maxi", timestamp: "3h ago", bgColor: "#14F195" },
  { id: "l4", title: "Jupiter aggregator", creator: "defi_anon", timestamp: "1d ago", bgColor: "#FFD93D" },
  { id: "l5", title: "Firedancer node", creator: "cryptovibe", timestamp: "2d ago", bgColor: "#4ECDC4" },
  { id: "l6", title: "Backpack wallet review", creator: "web3.girl", timestamp: "3d ago", bgColor: "#FF8B94" },
  { id: "l7", title: "Pyth price feeds", creator: "0xsolana", timestamp: "5d ago", bgColor: "#9945FF" },
  { id: "l8", title: "Drift Protocol", creator: "defi_anon", timestamp: "1w ago", bgColor: "#FFD93D" },
];

export const mockHistoryItems: ActivityItem[] = [
  { id: "h1", title: "Compressed NFTs", creator: "cryptovibe", timestamp: "just now", bgColor: "#14F195" },
  { id: "h2", title: "Anchor tutorial pt.1", creator: "0xsolana", timestamp: "5m ago", bgColor: "#9945FF" },
  { id: "h3", title: "My DeFi portfolio", creator: "defi_anon", timestamp: "12m ago", bgColor: "#FFD93D" },
  { id: "h4", title: "Phantom > MetaMask", creator: "sol.maxi", timestamp: "30m ago", bgColor: "#4ECDC4" },
  { id: "h5", title: "Helium migration", creator: "nft.punk", timestamp: "2h ago", bgColor: "#FF6B6B" },
  { id: "h6", title: "On-chain art exhibit", creator: "web3.girl", timestamp: "4h ago", bgColor: "#FF8B94" },
  { id: "h7", title: "Mango Markets recap", creator: "cryptovibe", timestamp: "6h ago", bgColor: "#14F195" },
  { id: "h8", title: "Solana Mobile Chapter 2", creator: "sol.maxi", timestamp: "1d ago", bgColor: "#4ECDC4" },
  { id: "h9", title: "Serum orderbook deep dive", creator: "defi_anon", timestamp: "2d ago", bgColor: "#FFD93D" },
  { id: "h10", title: "Metaplex deep dive", creator: "0xsolana", timestamp: "4d ago", bgColor: "#9945FF" },
];
