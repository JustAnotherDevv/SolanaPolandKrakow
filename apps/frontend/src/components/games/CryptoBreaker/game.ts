import { GameSDK } from '@/lib/sdk/GameSDK'

interface Brick {
  x: number; y: number; w: number; h: number
  color: string; label: string; alive: boolean; hp: number
}

interface Ball {
  x: number; y: number; vx: number; vy: number; r: number
}

const BRICK_COLORS: [string, string][] = [
  ['#9945FF', 'SOL'],
  ['#F7931A', 'BTC'],
  ['#627EEA', 'ETH'],
  ['#14F195', 'RAY'],
  ['#E84142', 'AVAX'],
]

export class CryptoBreakerGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private sdk: GameSDK
  private rafId = 0
  private paused = false
  private destroyed = false

  private balls: Ball[] = []
  private paddleX = 0
  private paddleW = 90
  private bricks: Brick[] = []
  private score = 0
  private lives = 3
  private level = 1
  private started = false
  private gameOver = false
  private lastTime = 0

  constructor(canvas: HTMLCanvasElement, sdk: GameSDK) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.sdk = sdk
    this.paddleX = canvas.width / 2 - this.paddleW / 2
    this.buildBricks()
    this.spawnBall()
    this.bindInput()
  }

  private buildBricks() {
    this.bricks = []
    const cols = 8, rows = 5
    const margin = 10
    const bw = (this.canvas.width - margin * (cols + 1)) / cols
    const bh = 24
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const [color, label] = BRICK_COLORS[(r + c) % BRICK_COLORS.length]
        this.bricks.push({
          x: margin + c * (bw + margin),
          y: 50 + r * (bh + 6),
          w: bw, h: bh, color, label,
          alive: true, hp: r < 2 ? 1 : 2,
        })
      }
    }
  }

  private spawnBall() {
    this.balls = [{
      x: this.canvas.width / 2,
      y: this.canvas.height - 80,
      vx: (Math.random() > 0.5 ? 1 : -1) * (3 + this.level * 0.3),
      vy: -(3.5 + this.level * 0.3),
      r: 8,
    }]
  }

  private bindInput() {
    this.onMove = this.onMove.bind(this)
    this.onKey = this.onKey.bind(this)
    this.canvas.addEventListener('pointermove', this.onMove)
    this.canvas.addEventListener('touchmove', this.onMove)
    window.addEventListener('keydown', this.onKey)
  }

  private onMove(e: Event) {
    const evt = e as PointerEvent | TouchEvent
    const rect = this.canvas.getBoundingClientRect()
    const clientX = 'touches' in evt ? evt.touches[0].clientX : (evt as PointerEvent).clientX
    const x = (clientX - rect.left) * (this.canvas.width / rect.width)
    this.paddleX = Math.max(0, Math.min(this.canvas.width - this.paddleW, x - this.paddleW / 2))
    if (!this.started) this.startGame()
  }

  private onKey(e: KeyboardEvent) {
    const speed = 20
    if (e.key === 'ArrowLeft') this.paddleX = Math.max(0, this.paddleX - speed)
    if (e.key === 'ArrowRight') this.paddleX = Math.min(this.canvas.width - this.paddleW, this.paddleX + speed)
    if (!this.started) this.startGame()
  }

  private startGame() {
    if (this.started || this.gameOver) return
    this.started = true
    this.sdk.gameplayStart()
    this.sdk.updateLives(this.lives)
  }

  start() { this.rafId = requestAnimationFrame(this.loop) }
  pause() { this.paused = true; cancelAnimationFrame(this.rafId) }
  resume() { if (this.destroyed) return; this.paused = false; this.rafId = requestAnimationFrame(this.loop) }
  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.rafId)
    this.canvas.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('keydown', this.onKey)
  }

  private loop = (ts: number) => {
    if (this.paused || this.destroyed) return
    const dt = Math.min(ts - this.lastTime, 32)
    this.lastTime = ts
    if (this.started) this.update(dt)
    this.render()
    if (!this.gameOver) this.rafId = requestAnimationFrame(this.loop)
  }

  private update(_dt: number) {
    for (const ball of this.balls) {
      ball.x += ball.vx
      ball.y += ball.vy

      // Wall
      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1 }
      if (ball.x + ball.r > this.canvas.width) { ball.x = this.canvas.width - ball.r; ball.vx *= -1 }
      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1 }

      // Paddle
      const py = this.canvas.height - 40
      if (ball.vy > 0 &&
        ball.y + ball.r >= py && ball.y + ball.r <= py + 12 &&
        ball.x >= this.paddleX - 4 && ball.x <= this.paddleX + this.paddleW + 4) {
        ball.vy = -Math.abs(ball.vy)
        const hit = (ball.x - (this.paddleX + this.paddleW / 2)) / (this.paddleW / 2)
        ball.vx = hit * 4.5
      }

      // Lost
      if (ball.y - ball.r > this.canvas.height) {
        this.lives--
        this.sdk.updateLives(this.lives)
        if (this.lives <= 0) {
          this.gameOver = true
          this.sdk.endGame(this.score)
          return
        }
        this.spawnBall()
        return
      }

      // Bricks
      for (const b of this.bricks) {
        if (!b.alive) continue
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
          b.hp--
          if (b.hp <= 0) {
            b.alive = false
            this.score += 10 * this.level
            this.sdk.updateScore(this.score)
          }
          // Simple reflect
          const fromLeft = ball.x < b.x || ball.x > b.x + b.w
          if (fromLeft) ball.vx *= -1; else ball.vy *= -1
        }
      }
    }

    // Level up
    if (this.bricks.every(b => !b.alive)) {
      this.level++
      this.buildBricks()
      this.spawnBall()
    }
  }

  private render() {
    const { ctx, canvas: c } = this
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, c.width, c.height)

    // Grid bg
    ctx.strokeStyle = 'rgba(153,69,255,0.04)'
    ctx.lineWidth = 1
    for (let i = 0; i < c.width; i += 30) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, c.height); ctx.stroke() }
    for (let i = 0; i < c.height; i += 30) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(c.width, i); ctx.stroke() }

    // Bricks
    for (const b of this.bricks) {
      if (!b.alive) continue
      ctx.shadowColor = b.color
      ctx.shadowBlur = b.hp > 1 ? 10 : 5
      ctx.fillStyle = b.hp > 1 ? b.color : b.color + '88'
      ctx.fillRect(b.x, b.y, b.w, b.h)
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.font = '500 9px "Geist Sans",sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 3)
    }

    // Paddle
    ctx.shadowColor = '#9945FF'
    ctx.shadowBlur = 14
    const grad = ctx.createLinearGradient(this.paddleX, 0, this.paddleX + this.paddleW, 0)
    grad.addColorStop(0, '#4b0082')
    grad.addColorStop(0.5, '#9945FF')
    grad.addColorStop(1, '#4b0082')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(this.paddleX, c.height - 40, this.paddleW, 10, 5)
    ctx.fill()
    ctx.shadowBlur = 0

    // Balls
    for (const ball of this.balls) {
      ctx.shadowColor = '#fff'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // HUD
    ctx.font = '300 13px "Geist Sans",sans-serif'
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText(`LVL ${this.level}`, 10, 24)
    ctx.textAlign = 'right'
    ctx.fillText(`${this.lives} ♥`, c.width - 10, 24)
    ctx.textAlign = 'center'
    ctx.font = '600 20px "Geist Sans",sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText(String(this.score), c.width / 2, 24)

    // Prompt
    if (!this.started) {
      ctx.font = '400 14px "Geist Sans",sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fillText('move paddle to start', c.width / 2, c.height / 2 + 40)
    }
  }
}
