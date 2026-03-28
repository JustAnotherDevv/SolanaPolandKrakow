import { GameSDK } from '@/lib/sdk/GameSDK'

type Cell = string | null
type TetrominoShape = number[][]

const COLS = 10
const ROWS = 18

const PIECES: { shape: TetrominoShape; color: string }[] = [
  { shape: [[1,1,1,1]], color: '#9945FF' },                          // I
  { shape: [[1,1],[1,1]], color: '#14F195' },                        // O
  { shape: [[0,1,0],[1,1,1]], color: '#FFD93D' },                    // T
  { shape: [[1,0,0],[1,1,1]], color: '#FF6B6B' },                    // L
  { shape: [[0,0,1],[1,1,1]], color: '#4ECDC4' },                    // J
  { shape: [[0,1,1],[1,1,0]], color: '#F7931A' },                    // S
  { shape: [[1,1,0],[0,1,1]], color: '#627EEA' },                    // Z
]

export class BlockBlitzGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private sdk: GameSDK
  private rafId = 0
  private paused = false
  private destroyed = false

  private board: Cell[][] = []
  private piece: { shape: TetrominoShape; color: string; x: number; y: number } | null = null
  private score = 0
  private level = 1
  private lines = 0
  private gameOver = false
  private started = false
  private dropInterval = 600
  private lastDrop = 0
  private lastTime = 0

  private readonly CELL: number

  constructor(canvas: HTMLCanvasElement, sdk: GameSDK) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.sdk = sdk
    this.CELL = Math.floor(Math.min(canvas.width / (COLS + 6), canvas.height / (ROWS + 2)))
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
    this.spawnPiece()
    this.bindInput()
  }

  private spawnPiece() {
    const tmpl = PIECES[Math.floor(Math.random() * PIECES.length)]
    this.piece = {
      shape: tmpl.shape,
      color: tmpl.color,
      x: Math.floor(COLS / 2) - Math.floor(tmpl.shape[0].length / 2),
      y: 0,
    }
    if (!this.valid(this.piece.shape, this.piece.x, this.piece.y)) {
      this.gameOver = true
      this.sdk.endGame(this.score)
    }
  }

  private valid(shape: TetrominoShape, ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue
        const nx = ox + c, ny = oy + r
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false
        if (ny >= 0 && this.board[ny][nx]) return false
      }
    }
    return true
  }

  private lockPiece() {
    if (!this.piece) return
    for (let r = 0; r < this.piece.shape.length; r++) {
      for (let c = 0; c < this.piece.shape[r].length; c++) {
        if (this.piece.shape[r][c]) {
          const ny = this.piece.y + r
          if (ny >= 0) this.board[ny][this.piece.x + c] = this.piece.color
        }
      }
    }
    this.clearLines()
    this.spawnPiece()
  }

  private clearLines() {
    const full = this.board.reduce((acc, row, i) => {
      if (row.every(c => c !== null)) acc.push(i)
      return acc
    }, [] as number[])
    if (full.length === 0) return

    for (const i of full) {
      this.board.splice(i, 1)
      this.board.unshift(Array(COLS).fill(null))
    }

    const pts = [0, 100, 300, 500, 800]
    this.score += (pts[full.length] ?? 800) * this.level
    this.lines += full.length
    this.level = Math.floor(this.lines / 10) + 1
    this.dropInterval = Math.max(80, 600 - (this.level - 1) * 50)
    this.sdk.updateScore(this.score)
  }

  private bindInput() {
    this.onKey = this.onKey.bind(this)
    window.addEventListener('keydown', this.onKey)
  }

  private onKey(e: KeyboardEvent) {
    if (this.gameOver || this.paused || !this.piece) return
    if (!this.started) { this.started = true; this.sdk.gameplayStart() }
    switch (e.key) {
      case 'ArrowLeft':
        if (this.valid(this.piece.shape, this.piece.x - 1, this.piece.y)) this.piece.x--
        break
      case 'ArrowRight':
        if (this.valid(this.piece.shape, this.piece.x + 1, this.piece.y)) this.piece.x++
        break
      case 'ArrowDown':
        if (this.valid(this.piece.shape, this.piece.x, this.piece.y + 1)) this.piece.y++
        else this.lockPiece()
        break
      case 'ArrowUp':
      case ' ':
        e.preventDefault()
        this.rotate()
        if (!this.started) { this.started = true; this.sdk.gameplayStart() }
        break
    }
  }

  private rotate() {
    if (!this.piece) return
    const s = this.piece.shape
    const rotated = s[0].map((_, i) => s.map(r => r[i]).reverse())
    if (this.valid(rotated, this.piece.x, this.piece.y)) this.piece.shape = rotated
  }

  start() { this.rafId = requestAnimationFrame(this.loop) }
  pause() { this.paused = true; cancelAnimationFrame(this.rafId) }
  resume() { if (this.destroyed) return; this.paused = false; this.rafId = requestAnimationFrame(this.loop) }
  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('keydown', this.onKey)
  }

  private loop = (ts: number) => {
    if (this.paused || this.destroyed) return
    const dt = ts - this.lastTime
    this.lastTime = ts

    if (this.started && !this.gameOver) {
      this.lastDrop += dt
      if (this.lastDrop > this.dropInterval) {
        this.lastDrop = 0
        if (this.piece && this.valid(this.piece.shape, this.piece.x, this.piece.y + 1)) {
          this.piece.y++
        } else {
          this.lockPiece()
        }
      }
    }

    this.render()
    if (!this.gameOver) this.rafId = requestAnimationFrame(this.loop)
  }

  private render() {
    const { ctx, canvas: c } = this
    const cell = this.CELL
    const offsetX = Math.floor((c.width - COLS * cell) / 2)
    const offsetY = Math.floor((c.height - ROWS * cell) / 2)

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, c.width, c.height)

    // Board outline
    ctx.strokeStyle = 'rgba(153,69,255,0.15)'
    ctx.lineWidth = 1
    ctx.strokeRect(offsetX - 1, offsetY - 1, COLS * cell + 2, ROWS * cell + 2)

    // Cells
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        const color = this.board[r][col]
        if (color) {
          this.drawCell(offsetX + col * cell, offsetY + r * cell, cell, color)
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.02)'
          ctx.fillRect(offsetX + col * cell, offsetY + r * cell, cell - 1, cell - 1)
        }
      }
    }

    // Active piece
    if (this.piece) {
      for (let r = 0; r < this.piece.shape.length; r++) {
        for (let col = 0; col < this.piece.shape[r].length; col++) {
          if (this.piece.shape[r][col]) {
            this.drawCell(
              offsetX + (this.piece.x + col) * cell,
              offsetY + (this.piece.y + r) * cell,
              cell,
              this.piece.color
            )
          }
        }
      }
    }

    // HUD
    ctx.font = '500 22px "Geist Sans",sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText(String(this.score), c.width / 2, 32)

    ctx.font = '300 11px "Geist Sans",sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText(`LVL ${this.level}  LINES ${this.lines}`, c.width / 2, 48)

    if (!this.started) {
      ctx.font = '400 13px "Geist Sans",sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fillText('arrow keys to play', c.width / 2, c.height - 20)
    }
  }

  private drawCell(x: number, y: number, size: number, color: string) {
    const ctx = this.ctx
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    ctx.fillStyle = color
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(x + 1, y + 1, size - 2, 3)
  }
}
