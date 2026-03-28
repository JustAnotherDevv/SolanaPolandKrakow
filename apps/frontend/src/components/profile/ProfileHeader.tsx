import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "motion/react";
import { Copy, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSolanaBalance } from "@/hooks/useSolanaBalance";
import { mockLikedItems, mockHistoryItems } from "@/lib/mockData";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ProfileHeader() {
  const { publicKey, connected } = useWallet();
  const { formatted, loading: balanceLoading } = useSolanaBalance(publicKey ?? null);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!connected || !publicKey) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5 px-8 text-center">
        <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center mb-2">
          <span className="text-xl font-light text-muted-foreground">?</span>
        </div>
        <div>
          <p className="text-sm font-light text-foreground mb-1">No wallet connected</p>
          <p className="text-xs text-muted-foreground font-light">
            Connect your wallet to view your profile
          </p>
        </div>
        <WalletMultiButton
          style={{
            background: "hsl(var(--primary))",
            border: "none",
            borderRadius: "var(--radius)",
            color: "#fff",
            fontSize: "12px",
            fontWeight: 400,
            fontFamily: "inherit",
            height: "36px",
            padding: "0 20px",
          }}
        >
          Connect Wallet
        </WalletMultiButton>
      </div>
    );
  }

  return (
    <motion.div
      className="px-5 pt-6 pb-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-4 mb-5">
        <Avatar className="w-14 h-14 ring-1 ring-primary/60 ring-offset-1 ring-offset-background">
          <AvatarFallback
            className="text-base font-medium text-white"
            style={{ background: "hsl(var(--primary) / 0.25)" }}
          >
            {publicKey.toBase58().slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <button
            className="flex items-center gap-1.5 group"
            onClick={handleCopy}
            aria-label="Copy wallet address"
          >
            <span className="text-sm font-light text-foreground/80 truncate">
              {truncateAddress(publicKey.toBase58())}
            </span>
            <motion.span
              key={copied ? "check" : "copy"}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {copied ? (
                <Check size={12} className="text-primary" />
              ) : (
                <Copy size={12} className="text-muted-foreground group-hover:text-foreground/60 transition-colors" />
              )}
            </motion.span>
          </button>

          {/* Balance */}
          <div className="mt-1">
            {balanceLoading ? (
              <Skeleton className="w-20 h-4 rounded" />
            ) : (
              <span className="text-lg font-light text-foreground tabular-nums">
                {formatted ?? "—"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center rounded-lg border border-border overflow-hidden">
        <div className="flex-1 flex flex-col items-center py-3">
          <span className="text-base font-light tabular-nums">{mockLikedItems.length}</span>
          <span className="text-[10px] font-light text-muted-foreground uppercase tracking-widest mt-0.5">
            Liked
          </span>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex-1 flex flex-col items-center py-3">
          <span className="text-base font-light tabular-nums">{mockHistoryItems.length}</span>
          <span className="text-[10px] font-light text-muted-foreground uppercase tracking-widest mt-0.5">
            History
          </span>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex-1 flex flex-col items-center py-3">
          <span className="text-base font-light tabular-nums">Devnet</span>
          <span className="text-[10px] font-light text-muted-foreground uppercase tracking-widest mt-0.5">
            Network
          </span>
        </div>
      </div>
    </motion.div>
  );
}
