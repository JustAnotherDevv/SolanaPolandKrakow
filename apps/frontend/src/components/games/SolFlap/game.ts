import { GameSDK } from '@/lib/sdk/GameSDK'

interface Pipe {
  x: number
  topH: number
  gap: number
  passed: boolean
}

export class SolFlapGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private sdk: GameSDK
  private rafId = 0
  private paused = false
  private destroyed = false

  // Game state
  private birdY = 0
  private birdVY = 0
  private score = 0
  private pipes: Pipe[] = []
  private frameCount = 0
  private gameOver = false
  private started = false

  // Tuning
  private readonly GRAVITY = 0.45
  private readonly JUMP = -7.5
  private readonly PIPE_SPEED = 2.2
  private readonly PIPE_WIDTH = 52
  private readonly BIRD_RADIUS = 14
  private readonly GAP_BASE = 160
  private readonly PIPE_INTERVAL = 90

  constructor(canvas: HTMLCanvasElement, sdk: GameSDK) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.sdk = sdk
    this.reset()
    this.bindInput()
  }

  private reset() {
    this.birdY = this.canvas.height / 2
    this.birdVY = 0
    this.score = 0
    this.pipes = []
    this.frameCount = 0
    this.gameOver = false
    this.started = false
  }

  private bindInput() {
    this.onKey = this.onKey.bind(this)
    this.onTap = this.onTap.bind(this)
    window.addEventListener('keydown', this.onKey)
    this.canvas.addEventListener('pointerdown', this.onTap)
  }

  private onKey(e: KeyboardEvent) {
    if (e.code === 'Space' || e.code === 'ArrowUp') this.flap()
  }

  private onTap() {
    this.flap()
  }

  private flap() {
    if (this.gameOver || this.paused || this.destroyed) return
    if (!this.started) {
      this.started = true
      this.sdk.gameplayStart()
    }
    this.birdVY = this.JUMP
  }

  start() {
    this.rafId = requestAnimationFrame(this.loop)
  }

  pause() {
    this.paused = true
    cancelAnimationFrame(this.rafId)
  }

  resume() {
    if (this.destroyed) return
    this.paused = false
    this.rafId = requestAnimationFrame(this.loop)
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('keydown', this.onKey)
    this.canvas.removeEventListener('pointerdown', this.onTap)
  }

  private loop = () => {
    if (this.paused || this.destroyed) return
    this.update()
    this.render()
    if (!this.gameOver) {
      this.rafId = requestAnimationFrame(this.loop)
    }
  }

  private update() {
    if (!this.started) return
    this.frameCount++

    // Physics
    this.birdVY += this.GRAVITY
    this.birdY += this.birdVY

    // Spawn pipes
    if (this.frameCount % this.PIPE_INTERVAL === 0) {
      const minH = 60
      const maxH = this.canvas.height - this.GAP_BASE - 60
      const topH = minH + Math.random() * (maxH - minH)
      const gap = Math.max(100, this.GAP_BASE - Math.floor(this.score / 5) * 5)
      this.pipes.push({ x: this.canvas.width + 10, topH, gap, passed: false })
    }

    // Move pipes & score
    for (const pipe of this.pipes) {
      pipe.x -= this.PIPE_SPEED
      if (!pipe.passed && pipe.x + this.PIPE_WIDTH < this.canvas.width * 0.25) {
        pipe.passed = true
        this.score++
        this.sdk.updateScore(this.score)
      }
    }
    this.pipes = this.pipes.filter((p) => p.x > -this.PIPE_WIDTH - 10)

    // Collision
    const bx = this.canvas.width * 0.25
    const by = this.birdY

    if (by - this.BIRD_RADIUS < 0 || by + this.BIRD_RADIUS > this.canvas.height) {
      this.triggerDeath()
      return
    }

    for (const pipe of this.pipes) {
      if (bx + this.BIRD_RADIUS > pipe.x && bx - this.BIRD_RADIUS < pipe.x + this.PIPE_WIDTH) {
        if (by - this.BIRD_RADIUS < pipe.topH || by + this.BIRD_RADIUS > pipe.topH + pipe.gap) {
          this.triggerDeath()
          return
        }
      }
    }
  }

  private triggerDeath() {
    this.gameOver = true
    this.sdk.endGame(this.score)
  }

  private render() {
    const { canvas: c, ctx } = this
    ctx.clearRect(0, 0, c.width, c.height)

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, c.height)
    sky.addColorStop(0, '#050510')
    sky.addColorStop(1, '#0d0025')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, c.width, c.height)

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137 + 50) % c.width)
      const sy = ((i * 73 + 20) % (c.height * 0.7))
      ctx.beginPath()
      ctx.arc(sx, sy, 1, 0, Math.PI * 2)
      ctx.fill()
    }

    // Pipes
    for (const pipe of this.pipes) {
      this.drawPipe(pipe.x, 0, pipe.topH, true)
      this.drawPipe(pipe.x, pipe.topH + pipe.gap, c.height - pipe.topH - pipe.gap, false)
    }

    // Bird
    const bx = c.width * 0.25
    ctx.save()
    ctx.translate(bx, this.birdY)
    const tilt = Math.min(30, Math.max(-20, this.birdVY * 3))
    ctx.rotate((tilt * Math.PI) / 180)

    // Glow
    ctx.shadowColor = '#9945FF'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(0, 0, this.BIRD_RADIUS, 0, Math.PI * 2)
    const birdGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.BIRD_RADIUS)
    birdGrad.addColorStop(0, '#c483ff')
    birdGrad.addColorStop(1, '#6b21a8')
    ctx.fillStyle = birdGrad
    ctx.fill()
    ctx.shadowBlur = 0

    // Wing
    ctx.beginPath()
    ctx.ellipse(4, 5, 8, 4, 0.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(153, 69, 255, 0.5)'
    ctx.fill()
    ctx.restore()

    // HUD
    if (this.started && !this.gameOver) {
      ctx.font = '700 28px "Geist Sans", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText(String(this.score), c.width / 2, 44)
    }

    // Start prompt
    if (!this.started) {
      ctx.font = '400 14px "Geist Sans", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText('tap or press space to start', c.width / 2, c.height / 2 + 50)
    }
  }

  private drawPipe(x: number, y: number, h: number, isTop: boolean) {
    const ctx = this.ctx
    const w = this.PIPE_WIDTH

    ctx.shadowColor = '#14F195'
    ctx.shadowBlur = 8

    const grad = ctx.createLinearGradient(x, 0, x + w, 0)
    grad.addColorStop(0, '#0a2e1a')
    grad.addColorStop(0.3, '#14F195')
    grad.addColorStop(1, '#0a2e1a')
    ctx.fillStyle = grad
    ctx.fillRect(x, y, w, h)

    // Cap
    const capH = 14
    const capX = x - 4
    const capY = isTop ? y + h - capH : y
    const capGrad = ctx.createLinearGradient(capX, 0, capX + w + 8, 0)
    capGrad.addColorStop(0, '#052012')
    capGrad.addColorStop(0.3, '#14F195')
    capGrad.addColorStop(1, '#052012')
    ctx.fillStyle = capGrad
    ctx.fillRect(capX, capY, w + 8, capH)
    ctx.shadowBlur = 0
  }
}
