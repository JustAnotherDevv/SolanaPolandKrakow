import { WalletProvider } from "./providers/WalletProvider";
import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

function Home() {
  const { publicKey } = useWallet();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Solana Krakow</h1>
      <WalletMultiButton />
      {publicKey && (
        <p className="text-sm text-muted-foreground">
          Connected: {publicKey.toBase58()}
        </p>
      )}
      <Button variant="outline">shadcn/ui Button</Button>
    </main>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <Home />
    </WalletProvider>
  );
}
