import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react'
import { useWallet, useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { registerGame } from '@/lib/anchor/client'
import { PublicKey } from '@solana/web3.js'

type Step = 'form' | 'registry' | 'leaderboard' | 'vault' | 'tipjar' | 'done'

const STEP_ORDER: Step[] = ['form', 'registry', 'leaderboard', 'vault', 'tipjar', 'done']
const STEP_LABELS: Record<Step, string> = {
  form: 'Game Details',
  registry: 'Register Game',
  leaderboard: 'Init Leaderboard',
  vault: 'Init Reward Vault',
  tipjar: 'Init Tip Jar',
  done: 'Published!',
}

const BG_COLORS = [
  { label: 'Void', value: '#000000', value2: '#1a0a2e' },
  { label: 'Ocean', value: '#000000', value2: '#0a1a2e' },
  { label: 'Forest', value: '#000000', value2: '#0a2e1a' },
  { label: 'Ember', value: '#000000', value2: '#2e0a0a' },
  { label: 'Gold', value: '#000000', value2: '#2e1a0a' },
]

export function PublishForm() {
  const { connected } = useWallet()
  const wallet = useAnchorWallet()
  const { connection } = useConnection()

  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    slug: '',
    tags: '',
    bgIndex: 0,
    bronzeScore: '10',
    silverScore: '50',
    goldScore: '200',
  })

  function updateForm(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handlePublish() {
    if (!wallet) return
    setError(null)

    const steps: Step[] = ['registry', 'leaderboard', 'vault', 'tipjar', 'done']
    for (const s of steps) {
      setStep(s)
      if (s === 'done') break
      try {
        // TODO: replace with real program calls after IDL generation
        await registerGame(connection, wallet, {
          gameId: BigInt(Date.now()),
          name: form.name,
          description: form.description,
          slug: form.slug,
          thumbnailUri: '',
          tipJar: PublicKey.default,
          leaderboard: PublicKey.default,
          rewardMint: PublicKey.default,
        })
      } catch (err) {
        // Programs not deployed — show graceful error
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        setStep('form')
        return
      }
      // Simulated delay for UX
      await new Promise((r) => setTimeout(r, 800))
    }
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-8 text-center">
        <p className="text-sm font-light text-foreground/60">
          Connect your wallet to publish a game
        </p>
        <WalletMultiButton
          style={{
            background: 'hsl(var(--primary))',
            border: 'none',
            borderRadius: 'var(--radius)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 400,
            fontFamily: 'inherit',
            height: '36px',
            padding: '0 20px',
          }}
        />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 gap-4 text-center"
      >
        <CheckCircle2 size={40} className="text-primary" strokeWidth={1} />
        <h3 className="text-base font-light text-foreground">Game Published!</h3>
        <p className="text-xs font-light text-muted-foreground px-8">
          "{form.name}" is now live on the GameFeed. It will appear in the discovery feed.
        </p>
        <button
          onClick={() => { setStep('form'); setForm({ name: '', description: '', slug: '', tags: '', bgIndex: 0, bronzeScore: '10', silverScore: '50', goldScore: '200' }) }}
          className="mt-4 px-5 py-2 rounded-lg border border-border text-xs font-light text-muted-foreground hover:text-foreground transition-colors"
        >
          Publish Another
        </button>
      </motion.div>
    )
  }

  const isSubmitting = step !== 'form'

  return (
    <div className="px-5 py-5 flex flex-col gap-5">
      {/* Progress steps */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-col gap-2 p-4 rounded-xl border border-border"
          >
            {STEP_ORDER.filter((s) => s !== 'form').map((s) => {
              const idx = STEP_ORDER.indexOf(s)
              const currentIdx = STEP_ORDER.indexOf(step)
              const isDone = idx < currentIdx
              const isActive = s === step
              return (
                <div key={s} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isDone ? 'bg-primary/20' : isActive ? 'border border-primary/50' : 'border border-white/10'
                  }`}>
                    {isDone && <CheckCircle2 size={10} className="text-primary" />}
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <span className={`text-xs font-light ${isActive ? 'text-foreground' : isDone ? 'text-foreground/40' : 'text-white/20'}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/08 border border-red-500/20">
          <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs font-light text-red-400/80">{error}</p>
        </div>
      )}

      {/* Form fields */}
      <div className="flex flex-col gap-4">
        <Field label="Game Name">
          <input
            type="text"
            placeholder="e.g. SolFlap"
            value={form.name}
            onChange={(e) => updateForm('name', e.target.value)}
            className="w-full bg-transparent text-sm font-light text-foreground placeholder:text-muted-foreground/40 outline-none"
          />
        </Field>

        <Field label="Description">
          <textarea
            placeholder="What is this game about?"
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            rows={2}
            className="w-full bg-transparent text-sm font-light text-foreground placeholder:text-muted-foreground/40 outline-none resize-none"
          />
        </Field>

        <Field label="Slug">
          <input
            type="text"
            placeholder="e.g. sol-flap (lowercase, hyphens)"
            value={form.slug}
            onChange={(e) => updateForm('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="w-full bg-transparent text-sm font-light text-foreground placeholder:text-muted-foreground/40 outline-none font-mono"
          />
        </Field>

        <Field label="Tags (comma separated)">
          <input
            type="text"
            placeholder="arcade, solana, fun"
            value={form.tags}
            onChange={(e) => updateForm('tags', e.target.value)}
            className="w-full bg-transparent text-sm font-light text-foreground placeholder:text-muted-foreground/40 outline-none"
          />
        </Field>

        {/* Card theme */}
        <div>
          <label className="text-[10px] font-light text-muted-foreground uppercase tracking-widest mb-2 block">
            Card Theme
          </label>
          <div className="flex gap-2">
            {BG_COLORS.map((bg, i) => (
              <button
                key={i}
                onClick={() => updateForm('bgIndex', i)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-9 h-9 rounded-lg border transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${bg.value}, ${bg.value2})`,
                    borderColor: form.bgIndex === i ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.08)',
                  }}
                />
                <span className="text-[8px] text-muted-foreground font-light">{bg.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reward thresholds */}
        <div>
          <label className="text-[10px] font-light text-muted-foreground uppercase tracking-widest mb-2 block">
            Reward Thresholds
          </label>
          <div className="flex gap-3">
            {[
              { key: 'bronzeScore', label: 'Bronze', color: '#CD7F32' },
              { key: 'silverScore', label: 'Silver', color: '#C0C0C0' },
              { key: 'goldScore', label: 'Gold', color: '#FFD700' },
            ].map((t) => (
              <div key={t.key} className="flex-1">
                <label className="text-[9px] font-light mb-1 block" style={{ color: t.color }}>
                  {t.label}
                </label>
                <input
                  type="number"
                  value={form[t.key as keyof typeof form]}
                  onChange={(e) => updateForm(t.key, e.target.value)}
                  className="w-full bg-transparent text-sm font-light text-foreground outline-none border border-white/08 rounded-lg px-2 py-1.5 text-center tabular-nums"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        disabled={isSubmitting || !form.name || !form.slug}
        onClick={handlePublish}
        className="w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
        style={{
          background: 'hsl(var(--primary))',
          color: '#fff',
          opacity: isSubmitting || !form.name || !form.slug ? 0.5 : 1,
        }}
      >
        {isSubmitting ? (
          <>
            <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
            {STEP_LABELS[step]}
          </>
        ) : (
          <>
            Publish Game
            <ChevronRight size={16} />
          </>
        )}
      </button>

      <p className="text-center text-[10px] text-muted-foreground font-light">
        Publishing creates 4 on-chain accounts: registry, leaderboard, reward vault, and tip jar.
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl px-4 py-3">
      <label className="text-[10px] font-light text-muted-foreground uppercase tracking-widest mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  )
}
