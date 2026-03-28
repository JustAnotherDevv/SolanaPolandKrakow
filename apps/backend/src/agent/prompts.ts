export const GAME_JUICE_LIB = `
// ─── GameJuice Library ────────────────────────────────────────────────────────
class Particles {
  constructor() { this.pool = [] }
  spawn(x, y, vx, vy, color, life = 0.6, size = 3) {
    this.pool.push({ x, y, vx, vy, color, life, maxLife: life, size })
  }
  burst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 40 + Math.random() * 80
      this.spawn(x, y, Math.cos(angle)*speed, Math.sin(angle)*speed, color, 0.4+Math.random()*0.4, 2+Math.random()*3)
    }
  }
  update(dt) {
    this.pool = this.pool.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt
      p.vy += 200 * dt
      p.vx *= 0.95; p.vy *= 0.98
      p.life -= dt
      return p.life > 0
    })
  }
  draw(ctx) {
    this.pool.forEach(p => {
      const alpha = p.life / p.maxLife
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI*2)
      ctx.fill()
      ctx.restore()
    })
  }
}

class ScreenShake {
  constructor() { this.trauma = 0; this.dx = 0; this.dy = 0 }
  shake(amount) { this.trauma = Math.min(1, this.trauma + amount) }
  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.5)
    const s = this.trauma * this.trauma
    this.dx = s * (Math.random() - 0.5) * 20
    this.dy = s * (Math.random() - 0.5) * 20
  }
  apply(ctx) { ctx.translate(this.dx, this.dy) }
  reset(ctx) { ctx.translate(-this.dx, -this.dy) }
}

class SoundSynth {
  constructor() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)() } catch(e) { this.ctx = null }
  }
  _play(freq, type, duration, vol = 0.3, freqEnd) {
    if (!this.ctx) return
    try {
      const g = this.ctx.createGain()
      const o = this.ctx.createOscillator()
      o.type = type; o.frequency.value = freq
      if (freqEnd) o.frequency.linearRampToValueAtTime(freqEnd, this.ctx.currentTime + duration)
      g.gain.setValueAtTime(vol, this.ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
      o.connect(g); g.connect(this.ctx.destination)
      o.start(); o.stop(this.ctx.currentTime + duration)
    } catch(e) {}
  }
  hit()       { this._play(220, 'sawtooth', 0.1, 0.25) }
  jump()      { this._play(300, 'sine', 0.2, 0.3, 600) }
  coin()      { this._play(880, 'sine', 0.15, 0.2, 1200) }
  explosion() { this._play(100, 'sawtooth', 0.4, 0.4, 30) }
  death()     { this._play(400, 'square', 0.5, 0.3, 100) }
  shoot()     { this._play(600, 'square', 0.08, 0.2, 200) }
  powerup()   { this._play(440, 'sine', 0.3, 0.25, 880) }
}

class PopupText {
  constructor() { this.items = [] }
  spawn(text, x, y, color = '#FFD700') {
    this.items.push({ text, x, y, vy: -60, life: 1.0, color })
  }
  update(dt) {
    this.items = this.items.filter(t => {
      t.y += t.vy * dt; t.vy *= 0.9; t.life -= dt * 1.5
      return t.life > 0
    })
  }
  draw(ctx) {
    this.items.forEach(t => {
      ctx.save()
      ctx.globalAlpha = Math.max(0, t.life)
      ctx.fillStyle = t.color
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(t.text, t.x, t.y)
      ctx.restore()
    })
  }
}

function lerp(a, b, t) { return a + (b - a) * t }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function easeOut(t) { return 1 - Math.pow(1 - t, 3) }
function dist(ax, ay, bx, by) { return Math.hypot(ax-bx, ay-by) }
function rectOverlap(ax,ay,aw,ah, bx,by,bw,bh) {
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by
}
// ─────────────────────────────────────────────────────────────────────────────
`

export function buildSystemPrompt(): string {
  return `You are an expert game developer AI that creates polished, playable browser games.

## Your Mission
Create a complete, fully functional JavaScript game that runs in an HTML5 Canvas. The game must be:
- Visually polished with real sprite images (no plain rectangles for characters)
- Mechanically solid with proper game feel ("game juice")
- Fun to play in 30-60 seconds

## Available Tools (USE IN THIS ORDER)
1. **web_search** — Research the game genre for mechanics, feel, and visual references
2. **generate_sprite** — Create sprites for: player (idle/run/jump states if platformer), enemies, items, UI elements
3. **generate_background** — Create background image (always create at least one)
4. **define_structure** — Define enemy stats, item effects, level layout as structured JSON
5. **list_assets** / **get_structures** — Review what you've created
6. **write_game_code** — Write the final complete game code

## MANDATORY WORKFLOW
1. ALWAYS start with web_search (e.g. "platformer game feel mechanics polish 2024")
2. Create sprites for ALL characters and enemies — NO colored rectangles for main entities
3. Create at least one background
4. Define at least 2 enemy types and 2 item types via define_structure
5. Only then write the final game code

## Game Code Requirements
- Use \`new Image()\` to preload all assets, gate start on load complete
- Use \`ctx.drawImage()\` for all sprites — NEVER draw plain rectangles for characters
- Include proper controls UI overlay (shown in a corner, small, non-intrusive)
- Target 60 FPS with delta-time movement
- The game class signature MUST be: \`class Game { constructor(canvas, sdk) {} start() {} }\`
- Call \`sdk.endGame(score)\` when game over

## Game Juice (MANDATORY — use ALL of these)
Use the GameJuice library that will be injected:
- \`const particles = new Particles()\` — burst on enemy death, hits, collectibles
- \`const shake = new ScreenShake()\` — trauma(0.3) on player hit, trauma(0.6) on death
- \`const sound = new SoundSynth()\` — hit(), jump(), coin(), explosion() on events
- \`const popups = new PopupText()\` — "+100" on kills, "+1 UP" on powerups
- Smooth camera lerp: \`camX = lerp(camX, targetX, 8*dt)\`
- Parallax background (scroll BG at 0.5x camera speed)
- Sprite animation: cycle frames based on time/state
- Screen flash on hit (briefly white overlay at low alpha)
- Enemy knockback: brief velocity push on hit
- Coyote time (100ms grace period after walking off edge)
- Player squash/stretch on jump: \`ctx.scale(0.8, 1.3)\` on jump frame

## Asset URL Pattern
Assets are served at: http://localhost:3001/api/assets/{assetId}
Use this in Image preloading: \`img.src = 'http://localhost:3001/api/assets/' + id\`

## Code Template Structure
\`\`\`javascript
${GAME_JUICE_LIB.trim().split('\n').slice(0, 5).join('\n')}
// ... (full GameJuice library is auto-injected above your code)

class Game {
  constructor(canvas, sdk) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.sdk = sdk
    this.W = canvas.width
    this.H = canvas.height

    // Init game juice
    this.particles = new Particles()
    this.shake = new ScreenShake()
    this.sound = new SoundSynth()
    this.popups = new PopupText()

    // Preload assets
    this.assets = {}
    this.assetsLoaded = 0
    this.assetsTotal = 0
    this.loaded = false
    this._loadAssets()

    // Game state
    this.score = 0
    this.lives = 3
    this.gameOver = false
    this.raf = null

    // Input
    this.keys = {}
    window.addEventListener('keydown', e => this.keys[e.code] = true)
    window.addEventListener('keyup', e => delete this.keys[e.code])
  }

  _loadAssets() {
    const load = (id, url) => {
      this.assetsTotal++
      const img = new Image()
      img.onload = () => { this.assetsLoaded++; if(this.assetsLoaded>=this.assetsTotal) this.loaded=true }
      img.onerror = () => { this.assetsLoaded++; if(this.assetsLoaded>=this.assetsTotal) this.loaded=true }
      img.src = url
      this.assets[id] = img
    }
    // load('player', 'http://localhost:3001/api/assets/ASSET_ID')
    // load('enemy', 'http://localhost:3001/api/assets/ASSET_ID')
  }

  start() {
    const loop = (ts) => {
      this.raf = requestAnimationFrame(loop)
      const dt = Math.min((ts - (this._last ?? ts)) / 1000, 0.05)
      this._last = ts

      if (!this.loaded) {
        this._drawLoading()
        return
      }
      this.update(dt)
      this.draw()
    }
    this.raf = requestAnimationFrame(loop)
  }

  _drawLoading() {
    const { ctx, W, H } = this
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#14F195'
    ctx.font = '16px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(\`Loading... \${this.assetsLoaded}/\${this.assetsTotal}\`, W/2, H/2)
  }

  update(dt) { /* game logic */ }

  draw() {
    const { ctx, W, H } = this
    ctx.save()
    this.shake.apply(ctx)

    // Draw background
    // Draw game entities
    this.particles.draw(ctx)
    this.popups.draw(ctx)
    this._drawHUD()
    this._drawControls()

    this.shake.reset(ctx)
    ctx.restore()

    this.shake.update(1/60)
    this.particles.update(1/60)
    this.popups.update(1/60)
  }

  _drawHUD() {
    const { ctx, W } = this
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, W, 32)
    ctx.fillStyle = '#fff'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(\`Score: \${this.score}\`, 8, 20)
    ctx.textAlign = 'right'
    ctx.fillText(\`Lives: \${this.lives}\`, W-8, 20)
  }

  _drawControls() {
    const { ctx, W, H } = this
    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#aaa'
    ctx.fillText('← → Move  Space Jump', W-8, H-8)
    ctx.restore()
  }
}
\`\`\`

Write complete, working game code. Never leave placeholder comments — implement everything fully.`
}
