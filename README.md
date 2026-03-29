# SolEngine

AI-powered game engine on Solana. Describe a game in plain English, get a playable 2D or 3D browser game with built-in blockchain features — payments, NFT rewards, on-chain leaderboards, and in-game shops.

Built for the Solana Krakow Hackathon 2026.

---

## What it does

1. **Prompt-to-game** — Type "make a dungeon crawler with enemies and loot" and the AI agent builds a complete playable game (Canvas 2D or Three.js 3D)
2. **Iterative editing** — Chat with the AI to modify your game: "add more lights", "make enemies faster", "change the sky to sunset"
3. **Solana-native** — Tell the AI "require 0.1 SOL to play" or "add a weapon shop" and it wires up real on-chain transactions
4. **Publish & play** — Games appear in a TikTok-style vertical feed where players can play, tip creators, and compete on leaderboards

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Creator   │  │  3D IDE  │  │   Game Feed      │  │
│  │  Chat UI   │  │ Three.js │  │  (TikTok-style)  │  │
│  └─────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│        │              │                 │            │
│  ┌─────┴──────────────┴─────────────────┴─────────┐  │
│  │              GameSDK (bridge layer)             │  │
│  │  updateScore · requestPayment · showShop        │  │
│  │  mintNFT · submitScore · showLeaderboard        │  │
│  └──────────────────┬──────────────────────────────┘  │
│                     │                                │
│  ┌──────────────────┴──────────────────────────────┐  │
│  │           Solana Overlay Components             │  │
│  │  PaymentGate · ShopModal · MintModal            │  │
│  │  LeaderboardOverlay · TxStatus                  │  │
│  └──────────────────┬──────────────────────────────┘  │
│                     │                                │
│  ┌──────────────────┴──────────────────────────────┐  │
│  │         Wallet Adapter (Phantom, Devnet)        │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ SSE + REST
┌──────────────────────┴──────────────────────────────┐
│                   Backend (Express)                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │  Agent    │  │  Asset    │  │  SQLite DB       │  │
│  │  Loop     │  │  Gen      │  │  games · assets  │  │
│  │  (LLM)   │  │  (fal.ai) │  │  shop · payments │  │
│  └──────────┘  └───────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              Solana Programs (Anchor)                │
│  game_registry · leaderboard · reward_vault         │
│  tip_jar · solana_krakow                            │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Three.js, Zustand, CodeMirror |
| Backend | Node.js, Express, better-sqlite3, SSE streaming |
| AI | Google Gemini 2.0 Flash (via OpenRouter), fal.ai (image gen) |
| Blockchain | Solana (Devnet), Anchor, @solana/web3.js, Phantom wallet |
| Monorepo | npm workspaces |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp apps/backend/.env.example apps/backend/.env
# Fill in API keys: OPENROUTER_KEY, FAL_KEY, TAVILY_KEY, MINIMAX_API_KEY

# Run everything
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001`.

## Project Structure

```
solana-krakow/
├── apps/
│   ├── frontend/                  # React app
│   │   └── src/
│   │       ├── components/
│   │       │   ├── creator/       # 2D game creator (chat, canvas, versions)
│   │       │   ├── creator3d/     # 3D IDE (viewport, hierarchy, inspector)
│   │       │   ├── solana/        # Blockchain UI overlays
│   │       │   ├── feed/          # Game feed (play, like, tip)
│   │       │   └── games/         # Pre-built games (SolFlap, CryptoBreaker, etc.)
│   │       ├── lib/
│   │       │   ├── sdk/           # GameSDK — bridge between games and React/Solana
│   │       │   └── anchor/        # Anchor program clients + PDA derivation
│   │       ├── stores/            # Zustand stores (persisted to localStorage)
│   │       └── providers/         # Wallet + Query providers
│   │
│   └── backend/                   # Express API + AI agent
│       └── src/
│           ├── agent/             # AI agent loop, tools, prompts (2D + 3D)
│           ├── db/                # SQLite schema + client
│           ├── lib/               # OpenRouter, image gen, web search
│           └── routes/            # REST + SSE endpoints
│
└── anchor/                        # Solana programs
    └── programs/
        ├── game_registry/         # On-chain game metadata
        ├── leaderboard/           # Commit-reveal score system (top 10)
        ├── reward_vault/          # Tiered SPL token rewards
        ├── tip_jar/               # Creator tips with platform fee
        └── solana_krakow/         # Core program
```

## Solana Integration

Games built with SolEngine can include blockchain features out of the box. The AI agent understands these and can wire them in from natural language prompts.

### Payment Gates
> "Require 0.1 SOL to play"

Players see a payment modal before the game starts. SOL is transferred on-chain via Phantom wallet.

### In-Game Shops
> "Add a weapon shop with a sword for 0.05 SOL and a shield for 0.03 SOL"

A shop overlay appears in-game. Each purchase is a real SOL transaction.

### NFT Rewards
> "Mint an NFT when the player beats level 3"

Players can mint achievement NFTs at key game moments.

### On-Chain Leaderboards
> "Add a leaderboard that shows when the game ends"

Scores are submitted on-chain using a commit-reveal anti-cheat pattern. Top 10 scores stored in a Solana account.

## Anchor Programs

All programs are deployed to **Devnet**.

| Program | ID | Purpose |
|---------|----|---------|
| Game Registry | `DyQYRqHB...` | Game metadata, play counts, creator info |
| Leaderboard | `7ytj4Mrh...` | Commit-reveal top-10 scoring |
| Reward Vault | `2dRKWxJZ...` | Tiered SPL token minting for scores |
| Tip Jar | `9c2GADAN...` | Creator tips with configurable platform fee |

## How the AI Agent Works

1. User sends a message ("make a zombie shooter")
2. Backend streams progress via SSE (Server-Sent Events)
3. Agent uses tools in order:
   - `web_search` — research game mechanics (optional)
   - `set_scene_settings` / `place_object` — build the 3D scene
   - `add_payment_gate` / `add_shop_item` / `add_leaderboard` — wire Solana features
   - `write_3d_game_code` — output the final Game3D class
4. Frontend receives scene updates in real-time and renders the final game
5. For modifications, the agent receives the existing scene + code and makes targeted changes

## Environment Variables

```env
PORT=3001
OPENROUTER_KEY=sk-or-v1-...      # LLM API (Gemini Flash)
FAL_KEY=...                       # Image generation
TAVILY_KEY=tvly-...               # Web search
MINIMAX_API_KEY=sk-...            # Additional AI services
AGENT_MODEL=google/gemini-2.0-flash-001
CODE_MODEL=google/gemini-2.0-flash-001
DB_PATH=./data/gamefeed.db
```

## Scripts

```bash
npm run dev           # Run frontend + backend concurrently
npm run dev:frontend  # Frontend only (Vite)
npm run dev:backend   # Backend only (nodemon)
npm run build         # Build both for production
npm run test          # Run Anchor tests
```

## License

MIT
