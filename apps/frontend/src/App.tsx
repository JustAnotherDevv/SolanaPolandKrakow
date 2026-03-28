import { WalletProvider } from './providers/WalletProvider'
import { QueryProvider } from './providers/QueryProvider'
import { AppShell } from './components/layout/AppShell'

export default function App() {
  return (
    <QueryProvider>
      <WalletProvider>
        <AppShell />
      </WalletProvider>
    </QueryProvider>
  )
}
