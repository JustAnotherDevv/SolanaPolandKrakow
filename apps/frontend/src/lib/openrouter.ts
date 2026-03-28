const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.0-flash-001'

const SYSTEM_PROMPT = {
  role: 'system',
  content: `You are an expert game developer specializing in HTML5 Canvas 2D games. Your job is to generate complete, working JavaScript game code that runs directly in a browser canvas.

STRICT RULES:
1. Output EXACTLY ONE \`\`\`javascript code block containing the complete game class
2. The class MUST be named exactly \`Game\`
3. Constructor signature: \`constructor(canvas, sdk)\` where canvas is HTMLCanvasElement and sdk is the game SDK
4. Required methods: \`start()\`, \`pause()\`, \`resume()\`, \`destroy()\`
5. Use ONLY the Canvas 2D API (ctx = canvas.getContext('2d')). Zero imports, zero external libs, no DOM manipulation outside canvas
6. Implement a proper game loop using requestAnimationFrame stored as this.rafId
7. On score change: call \`sdk.updateScore(totalScore)\`
8. On game over / level complete: call \`sdk.endGame(finalScore)\`
9. destroy() MUST call cancelAnimationFrame(this.rafId) and remove all event listeners
10. Support both keyboard (arrows/WASD/space) AND touch events for mobile
11. Canvas dimensions: use canvas.width and canvas.height (they will be set dynamically)
12. Visual style: dark background (near-black), vivid neon/solana-purple (#9945FF) and solana-green (#14F195) accents

CONTROLS UI RULES (critical — players must always know how to play):
- Always render a semi-transparent controls legend on-screen (bottom-left corner) showing ALL active keyboard shortcuts, e.g. "SPACE: Jump  X: Shoot  ←→: Move"
- On-screen touch buttons must be large (min radius 40px), clearly labeled, AND show the keyboard key in small text below the label, e.g. "JUMP\n[SPACE]"
- If the game has shooting, auto-fire every 0.3s while a shoot button is held OR while Space/Z/X is held — never make the player tap repeatedly

GAME DESIGN RULES (critical — games must be immediately fun and reactive):
- Enemies that can damage the player must spawn in a Y range that guarantees overlap with the player's movement area — never purely random Y across the full canvas
- Collision feedback must be visually obvious: screen flash, particle burst, or color change lasting at least 0.3s
- Lives/health bar must be drawn prominently (large icons or a colored bar), not just tiny text
- Difficulty must ramp up smoothly — start easy so the player can feel the controls for 5+ seconds before the first challenge
- Always show a brief "controls help" screen for 2 seconds at game start before gameplay begins

Game loop pattern:
\`\`\`
start() {
  this.running = true;
  this.lastTime = performance.now();
  this.rafId = requestAnimationFrame(this.loop);
}
loop = (now) => {
  if (!this.running) return;
  const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap dt at 50ms
  this.lastTime = now;
  this.update(dt);
  this.render();
  this.rafId = requestAnimationFrame(this.loop);
}
\`\`\`

When asked to modify an existing game, output the ENTIRE updated class (not just the diff).
Think through the game mechanics carefully before writing code. Make games fun, polished, and visually impressive.`,
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function* streamGameGeneration(
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_KEY
  if (!apiKey) {
    throw new Error('VITE_OPENROUTER_KEY environment variable is not set')
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'GameFeed AI Creator',
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      messages: [SYSTEM_PROMPT, ...messages],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${err}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      try {
        const json = JSON.parse(trimmed.slice(6))
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // malformed chunk — skip
      }
    }
  }
}
