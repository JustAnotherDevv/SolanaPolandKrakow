import { useState, useEffect } from 'react'
import { Check, Copy } from 'lucide-react'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? ''

interface Asset {
  id: string
  name: string
  type: string
  url: string
  width: number
  height: number
}

interface AssetGalleryProps {
  gameId: string
}

export function AssetGallery({ gameId }: AssetGalleryProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!BACKEND || !gameId) return
    fetch(`${BACKEND}/api/games/${gameId}/assets`)
      .then((r) => r.json())
      .then((data: Asset[]) => setAssets(data))
      .catch(() => {})
  }, [gameId])

  if (!BACKEND || assets.length === 0) return null

  function copyUrl(asset: Asset) {
    navigator.clipboard.writeText(asset.url)
    setCopiedId(asset.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="px-4 py-3 border-t border-border/20">
      <p className="text-[9px] font-light text-muted-foreground/40 uppercase tracking-wider mb-2">
        Generated Assets ({assets.length})
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {assets.map((asset) => (
          <div key={asset.id} className="flex-shrink-0 group relative">
            <img
              src={asset.url}
              alt={asset.name}
              className="w-14 h-14 rounded-xl object-cover border border-border/20 bg-black/20"
            />
            <button
              onClick={() => copyUrl(asset)}
              className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy asset URL"
            >
              {copiedId === asset.id ? (
                <Check size={12} className="text-[#14F195]" />
              ) : (
                <Copy size={12} className="text-white/70" />
              )}
            </button>
            <p className="text-[8px] font-light text-muted-foreground/40 text-center mt-0.5 truncate w-14">
              {asset.name}
            </p>
            <span className="text-[7px] text-muted-foreground/30 text-center block -mt-0.5">
              {asset.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
