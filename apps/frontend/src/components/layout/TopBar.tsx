import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { cn } from "@/lib/utils";

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { publicKey, connected } = useWallet();

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-11 flex items-center justify-between px-4",
        "border-b border-border bg-background/60 backdrop-blur-md",
        className
      )}
    >
      <span className="text-sm font-light tracking-widest text-foreground/80 uppercase">
        solana
      </span>

      <div className="wallet-adapter-button-wrapper">
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
