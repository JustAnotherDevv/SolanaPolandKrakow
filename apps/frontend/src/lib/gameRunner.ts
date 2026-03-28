export interface GameSDKLike {
  updateScore(score: number): void
  endGame(finalScore: number): void
  updateLives?(lives: number): void
  achievement?(id: string, name: string): void
}

export interface GameInstance {
  start(): void
  pause(): void
  resume(): void
  destroy(): void
}

export function extractCode(aiResponse: string): string | null {
  // Try tagged blocks first: ```javascript or ```js
  const tagged = aiResponse.match(/```(?:javascript|js)\s*([\s\S]*?)```/)
  if (tagged) return tagged[1].trim()
  // Fallback: any ``` block that contains 'class Game'
  const any = aiResponse.match(/```\w*\s*([\s\S]*?class\s+Game[\s\S]*?)```/)
  if (any) return any[1].trim()
  // Last resort: if 'class Game' exists anywhere outside backticks, grab from there
  const classIdx = aiResponse.indexOf('class Game')
  if (classIdx !== -1) return aiResponse.slice(classIdx).trim()
  return null
}

export function runGameCode(
  canvas: HTMLCanvasElement,
  sdk: GameSDKLike,
  code: string,
): { instance: GameInstance | null; error: string | null } {
  try {
    const factory = new Function(
      'canvas',
      'sdk',
      `
${code}
if (typeof Game === 'undefined') {
  throw new Error('Game class not found. Make sure your code defines a class named "Game".');
}
return new Game(canvas, sdk);
`,
    )
    const instance = factory(canvas, sdk) as GameInstance
    // Start the game loop
    instance.start()
    return { instance, error: null }
  } catch (e) {
    return { instance: null, error: e instanceof Error ? e.message : String(e) }
  }
}
