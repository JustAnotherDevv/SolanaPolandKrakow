import { useState } from 'react'
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { History, Rocket } from 'lucide-react'
import { cn } from "@/lib/utils";
import { useCreatorStore } from '@/stores/creatorStore'
import { useFeedStore } from '@/stores/feedStore'
import type { Page } from './BottomNav'
import type { FeedGame } from '@/lib/mockData'

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

interface TopBarProps {
  className?: string;
  activePage?: Page;
}

function CreatorControls() {
  const { publicKey } = useWallet()
  const games         = useCreatorStore((s) => s.games)
  const activeGameId  = useCreatorStore((s) => s.activeGameId)
  const activeGame    = useCreatorStore((s) => s.games.find((g) => g.id === s.activeGameId))
  const showHistory   = useCreatorStore((s) => s.showHistory)
  const setShowHistory = useCreatorStore((s) => s.setShowHistory)
  const markPublished = useCreatorStore((s) => s.markPublished)
  const updateName    = useCreatorStore((s) => s.updateName)
  const addGame       = useFeedStore((s) => s.addGame)

  const [publishSuccess, setPublishSuccess] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')

  const hasCode = !!(activeGame?.code)

  function handlePublish() {
    if (!activeGame?.code || !activeGameId) return
    const addr = publicKey?.toBase58() ?? ''
    const short = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : 'AI'
    const feedGame: FeedGame = {
      id: `ai-${activeGameId}`,
      slug: `ai-${activeGameId}`,
      name: activeGame.name,
      description: activeGame.description || 'AI-generated game',
      creator: {
        name: short,
        address: addr || 'unknown',
        avatarColor: '#9945FF',
        initials: short.slice(0, 2).toUpperCase(),
      },
      tags: ['AI-Generated'],
      playCount: 0,
      totalTips: 0,
      bgColor: '#0d0d0d',
      bgColor2: '#1a0a2e',
      leaderboardAddress: '',
      tipJarAddress: '',
      rewardMintAddress: '',
      bronzeScore: 10,
      silverScore: 50,
      goldScore: 100,
    }
    addGame(feedGame)
    markPublished(activeGameId)
    setPublishSuccess(true)
    setTimeout(() => setPublishSuccess(false), 2500)
  }

  if (!activeGame) {
    return (
      <span className="text-[10px] font-light text-muted-foreground/40 uppercase tracking-widest">
        AI Creator
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <span className="text-[10px] font-light text-muted-foreground/30 uppercase tracking-widest flex-shrink-0">
        Creator
      </span>
      <span className="text-muted-foreground/20 flex-shrink-0">/</span>

      {editingName ? (
        <input
          autoFocus
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={() => {
            if (nameValue.trim()) updateName(activeGameId!, nameValue.trim())
            setEditingName(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { if (nameValue.trim()) updateName(activeGameId!, nameValue.trim()); setEditingName(false) }
            if (e.key === 'Escape') setEditingName(false)
          }}
          className="text-xs font-light bg-transparent border-b border-primary/40 outline-none text-foreground/80 max-w-[140px] min-w-[60px]"
          style={{ width: `${Math.max(60, nameValue.length * 7)}px` }}
        />
      ) : (
        <button
          onClick={() => { setNameValue(activeGame.name); setEditingName(true) }}
          className="text-xs font-light text-foreground/60 hover:text-foreground/90 truncate max-w-[140px] transition-colors text-left"
          title="Click to rename"
        >
          {activeGame.name}
        </button>
      )}

      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
        {hasCode && (
          publishSuccess ? (
            <span className="text-[10px] font-light text-[#14F195] px-2">Published!</span>
          ) : (
            <button
              onClick={handlePublish}
              disabled={activeGame.publishedToFeed}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-[#14F195]/70 bg-[#14F195]/8 hover:bg-[#14F195]/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#14F195]/15"
            >
              <Rocket size={9} />
              {activeGame.publishedToFeed ? 'Published' : 'Publish'}
            </button>
          )
        )}

        {games.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              'w-6 h-6 rounded flex items-center justify-center transition-all',
              showHistory ? 'bg-primary/20 text-primary' : 'text-muted-foreground/40 hover:bg-muted/20 hover:text-muted-foreground',
            )}
            title="Game library"
          >
            <History size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export function TopBar({ className, activePage }: TopBarProps) {
  const { publicKey, connected } = useWallet();
  const isCreator = activePage === 'publish'

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-11 flex items-center px-4 gap-3",
        "border-b border-border bg-background/60 backdrop-blur-md",
        className
      )}
    >
      {isCreator ? (
        <CreatorControls />
      ) : (
        <span className="text-sm font-light tracking-widest text-foreground/80 uppercase flex-1">
          solana
        </span>
      )}

      <div className="wallet-adapter-button-wrapper flex-shrink-0">
        {connected && publicKey ? (
          <WalletMultiButton
            style={{
              background: "transparent",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              color: "hsl(var(--foreground))",
              fontSize: "11px",
              fontWeight: 300,
              fontFamily: "inherit",
              height: "28px",
              padding: "0 10px",
              lineHeight: "28px",
            }}
          >
            {truncateAddress(publicKey.toBase58())}
          </WalletMultiButton>
        ) : (
          <WalletMultiButton
            style={{
              background: "hsl(var(--primary))",
              border: "none",
              borderRadius: "var(--radius)",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 400,
              fontFamily: "inherit",
              height: "28px",
              padding: "0 12px",
              lineHeight: "28px",
            }}
          >
            Connect
          </WalletMultiButton>
        )}
      </div>
    </div>
  );
}
