import { fal } from '@fal-ai/client'

fal.config({ credentials: () => process.env.FAL_KEY ?? '' })

interface FalResult {
  images: Array<{ url: string; content_type: string }>
}

export async function generateImage(
  prompt: string,
  width = 128,
  height = 128,
): Promise<Buffer> {
  const result = await fal.run('fal-ai/flux/schnell', {
    input: {
      prompt,
      image_size: { width, height },
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: false,
    },
  }) as unknown as FalResult

  const imageUrl = result.images[0]?.url
  if (!imageUrl) throw new Error('No image returned from fal.ai')

  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Failed to fetch generated image: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export function spritePrompt(description: string, style = 'pixel art'): string {
  return `${style} game sprite of ${description}, transparent background, clean edges, vibrant colors, game asset style, no text, no watermarks, high quality`
}

export function backgroundPrompt(description: string): string {
  return `2D game background, ${description}, pixel art style, seamless horizontal scroll, atmospheric colors, game environment art, no text, no characters`
}
