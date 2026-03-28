import { GameSDK } from '@/lib/sdk/GameSDK'

interface Obstacle {
  x: number
  y: number
  w: number
  h: number
  label: string
}

const HEX_LABELS = ['0x1a2b', 'NULL', 'FAIL', '0xDEAD', 'REVERT', '0x0000', 'TIMEOUT', 'GAS']

export class HashRunnerGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private sdk: GameSDK
  private rafId = 0
  private paused = false
  private destroyed = false

  private playerY = 0
  private playerVY = 0
  private isGrounded = true
  private obstacles: Obstacle[] = []
  private score = 0
  private speed = 3.5
  private frameCount = 0
  private started = false
  private gameOver = false
  private scoreTimer = 0

  private readonly GROUND_Y: number
  private readonly PLAYER_W = 24
  private readonly PLAYER_H = 32

  constructor(canvas: HTMLCanvasElement, sdk: GameSDK) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.sdk = sdk
    this.GROUND_Y = canvas.height - 80
    this.playerY = this.GROUND_Y - this.PLAYER_H
    this.bindInput()
  }

  private bindInput() {
    this.onKey = this.onKey.bind(this)
    this.onTap = this.onTap.bind(this)
    window.addEventListener('keydown', this.onKey)
    this.canvas.addEventListener('pointerdown', this.onTap)
  }

  private onKey(e: KeyboardEvent) {
    if (e.code === 'Space' || e.code === 'ArrowUp') this.jump()
  }
  private onTap() { this.jump() }

  private jump() {
    if (this.gameOver || this.paused || this.destroyed) return
    if (!this.started) {
      this.started = true
      this.sdk.gameplayStart()
    }
    if (this.isGrounded) {
      this.playerVY = -13
      this.isGrounded = false
    }
  }

  start() { this.rafId = requestAnimationFrame(this.loop) }
  pause() { this.paused = true; cancelAnimationFrame(this.rafId) }
  resume() { if (this.destroyed) return; this.paused = false; this.rafId = requestAnimationFrame(this.loop) }
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
    if (!this.gameOver) this.rafId = requestAnimationFrame(this.loop)
  }

  private update() {
    if (!this.started) return
    this.frameCount++

    // Speed up over time
    this.speed = 3.5 + this.frameCount / 800

    // Gravity
    this.playerVY += 0.7
    this.playerY += this.playerVY
    if (this.playerY >= this.GROUND_Y - this.PLAYER_H) {
      this.playerY = this.GROUND_Y - this.PLAYER_H
      this.playerVY = 0
      this.isGrounded = true
    }

    // Spawn obstacles
    const interval = Math.max(55, 90 - Math.floor(this.frameCount / 300))
    if (this.frameCount % interval === 0) {
      const h = 30 + Math.random() * 35
      this.obstacles.push({
        x: this.canvas.width + 20,
        y: this.GROUND_Y - h,
        w: 28 + Math.random() * 18,
        h,
        label: HEX_LABELS[Math.floor(Math.random() * HEX_LABELS.length)],
      })
    }

    // Move obstacles
    for (const o of this.obstacles) o.x -= this.speed
    this.obstacles = this.obstacles.filter(o => o.x + o.w > -10)

    // Score (per second)
    this.scoreTimer += 1 / 60
    if (this.scoreTimer >= 1) {
      this.scoreTimer -= 1
      this.score++
      this.sdk.updateScore(this.score)
    }

    // Collision
    const px = 60, py = this.playerY
    const pw = this.PLAYER_W, ph = this.PLAYER_H
    for (const o of this.obstacles) {
      if (px + pw - 4 > o.x && px + 4 < o.x + o.w &&
        py + ph - 4 > o.y && py + 4 < o.y + o.h) {
        this.gameOver = true
        this.sdk.endGame(this.score)
        return
      }
    }
  }

  private render() {
    const { ctx, canvas: c } = this
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, c.width, c.height)

    // Scrolling grid bg
    const offset = (this.frameCount * this.speed * 0.5) % 40
    ctx.strokeStyle = 'rgba(20,241,149,0.05)'
    ctx.lineWidth = 1
    for (let x = -offset; x < c.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke()
    }
    for (let y = 0; y < c.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke()
    }

    // Ground line
    ctx.strokeStyle = 'rgba(20,241,149,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, this.GROUND_Y)
    ctx.lineTo(c.width, this.GROUND_Y)
    ctx.stroke()

    // Obstacles
    for (const o of this.obstacles) {
      ctx.shadowColor = '#FF6B6B'
      ctx.shadowBlur = 8
      ctx.fillStyle = '#1a0505'
      ctx.strokeStyle = '#FF6B6B'
      ctx.lineWidth = 1
      ctx.fillRect(o.x, o.y, o.w, o.h)
      ctx.strokeRect(o.x, o.y, o.w, o.h)
      ctx.shadowBlur = 0
      ctx.font = '500 8px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#FF6B6B'
      ctx.fillText(o.label, o.x + o.w / 2, o.y + o.h / 2 + 3)
    }

    // Player
    const px = 60
    ctx.shadowColor = '#14F195'
    ctx.shadowBlur = 12
    ctx.fillStyle = '#14F195'
    ctx.fillRect(px, this.playerY, this.PLAYER_W, this.PLAYER_H)

    // Player detail
    ctx.fillStyle = '#000'
    ctx.fillRect(px + 6, this.playerY + 6, 5, 5)  // eye
    ctx.fillRect(px + 14, this.playerY + 6, 5, 5)
    ctx.shadowBlur = 0

    // Score
    ctx.font = '600 22px "Geist Sans",sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText(`${this.score}s`, c.width / 2, 38)

    // Prompt
    if (!this.started) {
      ctx.font = '400 14px "Geist Sans",sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fillText('tap or space to jump', c.width / 2, this.GROUND_Y - 60)
    }
  }
}
