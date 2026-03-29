import { fal } from '@fal-ai/client'

fal.config({ credentials: () => process.env.FAL_KEY ?? '' })

interface FalResult {
  data: { images: Array<{ url: string; content_type: string }> }
  requestId: string
}

interface RembgResult {
  data: { image: { url: string; content_type: string } }
  requestId: string
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
    ),
  ])
}

export async function generateImage(
  prompt: string,
  width = 128,
  height = 128,
  removeBackground = false,
): Promise<Buffer> {
  const result = await withTimeout(
    fal.run('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: { width, height },
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
      },
    }) as Promise<unknown>,
    45_000,
    'fal.ai image generation',
  ) as FalResult

  let imageUrl = result.data?.images?.[0]?.url
  if (!imageUrl) throw new Error('fal.ai returned no image URL')

  if (removeBackground) {
    const rembg = await withTimeout(
      fal.run('fal-ai/imageutils/rembg', { input: { image_url: imageUrl } }) as Promise<unknown>,
      30_000,
      'background removal',
    ) as RembgResult
    const transparentUrl = rembg.data?.image?.url
    if (transparentUrl) imageUrl = transparentUrl
  }

  const res = await withTimeout(fetch(imageUrl), 15_000, 'image download')
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export function spritePrompt(description: string, style = 'pixel art'): string {
  return `${style} game sprite of ${description}, pure white background, centered, full body visible, clean crisp edges, vibrant colors, game asset style, no text, no watermarks, high quality`
}

export function backgroundPrompt(description: string): string {
  return `2D game background, ${description}, pixel art style, seamless horizontal scroll, atmospheric colors, game environment art, no text, no characters`
}
