import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";

export function useSolanaBalance(publicKey: PublicKey | null) {
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (!cancelled) {
          setBalance(lamports / 1e9);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBalance(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  const formatted =
    balance !== null ? `◎ ${balance.toFixed(4)}` : null;

  return { balance, formatted, loading };
}
