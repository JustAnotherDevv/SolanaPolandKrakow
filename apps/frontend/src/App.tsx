import { WalletProvider } from "./providers/WalletProvider";
import { AppShell } from "./components/layout/AppShell";

export default function App() {
  return (
    <WalletProvider>
      <AppShell />
    </WalletProvider>
  );
}
