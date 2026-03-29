import { motion } from 'motion/react'

export interface GameTemplate3D {
  id: string
  name: string
  category: string
  description: string
  tags: string[]
  gradient: string
  icon: string
  prompt: string
}

export const TEMPLATES_3D: GameTemplate3D[] = [
  {
    id: 'fps',
    name: 'First Person Shooter',
    category: 'Shooter',
    description: 'Classic FPS with pistol & rifle, ammo pickups, enemy AI soldiers that patrol and shoot back. Industrial warehouse level.',
    tags: ['FPS', 'Combat', 'Shooter'],
    gradient: 'from-red-900/60 to-orange-900/40',
    icon: '🔫',
    prompt: 'Create a first person shooter (FPS) game. Player has a pistol (30 bullets) and can find rifle ammo pickups around the level. Mouse look for aiming, left click to shoot, WASD to move, Space to jump. 4 enemy soldiers patrol an industrial warehouse level — they detect the player and shoot back. Player has 100 HP, enemies deal 10 damage per hit. Score 100 per kill. Dramatic muzzle flash particle effect on shoot. Game ends when all enemies are dead or player dies. Dark industrial aesthetic with metal crates for cover.',
  },
  {
    id: 'third-person',
    name: 'Third Person Adventure',
    category: 'Adventure',
    description: 'Action-adventure with follow camera, melee combat, dodge roll, 4 enemy goblins, health potions and treasure collectibles.',
    tags: ['3rd Person', 'Adventure', 'Combat'],
    gradient: 'from-green-900/60 to-emerald-900/40',
    icon: '⚔️',
    prompt: 'Create a third person action-adventure game. Player character with follow camera (WASD move, Q/E rotate, Space jump, F attack, G dodge roll). Dungeon setting with stone walls and torches. 5 goblin enemies — green creatures that patrol then chase and melee attack player. 3 health potions spawn around the level (heal 30 HP). Treasure chest at the end grants 500 points. Player has 100 HP, goblins have 30 HP. Particle effects on hit, screen shake on damage. Win by collecting the treasure. Eerie dungeon aesthetic.',
  },
  {
    id: 'racing',
    name: 'Racing Game',
    category: 'Racing',
    description: 'High-speed car racing on a neon city circuit with 8 checkpoints, 3 AI rivals, lap timer, and drift mechanics.',
    tags: ['Racing', 'Cars', 'Speed'],
    gradient: 'from-blue-900/60 to-cyan-900/40',
    icon: '🏎️',
    prompt: 'Create a 3D racing game. Player drives a low-poly sports car: W/S or Up/Down for acceleration/brake, A/D or Left/Right to steer, Space for handbrake drift. Neon city night track with 8 glowing checkpoint arcs to race through in order. 3 AI car rivals that follow the track path. Lap timer displayed prominently. Complete 3 laps fastest to win. Speed boost pickups on track (blue glowing orbs). Cars leave tire trail effects. Score based on finish position. Vibrant neon aesthetic — purple/cyan buildings.',
  },
  {
    id: 'tower-defense',
    name: 'Tower Defense',
    category: 'Strategy',
    description: 'Top-down base defense. Enemies march along a path, spend gold to place cannon and laser towers. 5 escalating waves.',
    tags: ['Strategy', 'Defense', 'Tower'],
    gradient: 'from-yellow-900/60 to-amber-900/40',
    icon: '🏰',
    prompt: 'Create a top-down 3D tower defense game. Enemies (red cubes) march along a winding path from spawn to base. Player starts with 100 gold — click on tower spots (glowing pads) to place: Cannon Tower (50g, slow but powerful, AoE), Laser Tower (75g, fast, single target). 5 waves with escalating enemy count and HP. Each kill earns 10 gold. Enemies reaching base reduce lives by 1 (start with 20 lives). Path highlighted with arrows. Score by surviving all waves. Overhead isometric camera. Fantasy grassland aesthetic.',
  },
  {
    id: 'top-down-rpg',
    name: 'Top-Down RPG',
    category: 'RPG',
    description: 'Zelda-inspired. Explore overworld, fight skeletons and orcs with sword and bow, collect keys and potions.',
    tags: ['RPG', 'Top-Down', 'Zelda'],
    gradient: 'from-purple-900/60 to-violet-900/40',
    icon: '🗡️',
    prompt: 'Create a top-down RPG like Zelda. Top-down camera follows player. WASD to move, F to swing sword (close range), E to shoot arrow (limited arrows). Outdoor overworld with trees, rocks, and ruins as obstacles. 6 skeleton enemies (low HP, fast) and 3 orc enemies (high HP, slow, charge attack). Health potions (red orbs) and arrow bundles scattered around. Locked door requires finding a golden key. Boss orc guards the key. Player has 5 hearts (each hit = 1 heart). Win by finding the key, opening the door, and reaching the exit portal. Pixel art style 3D.',
  },
  {
    id: 'space-shooter',
    name: 'Space Shooter',
    category: 'Shooter',
    description: '3D space combat. Fly a starfighter through an asteroid field, blast enemy fighters with laser cannons. Cinematic space aesthetic.',
    tags: ['Space', 'Shooter', 'Sci-Fi'],
    gradient: 'from-indigo-900/60 to-blue-900/40',
    icon: '🚀',
    prompt: 'Create a 3D space shooter. Player pilots a starfighter in third-person. WASD for pitch/yaw, Q/E for roll, Shift boost, Space shoots laser bolts. Deep space asteroid field — 15 slowly rotating asteroids of various sizes to dodge and destroy. 5 enemy fighter ships with red glowing engines that pursue and shoot plasma blasts at player. Barrel roll dodge mechanic (double-tap A/D). Explosions with particle bursts. Shield system (3 shields, recharges slowly). Score 50 per asteroid, 200 per fighter. Cinematic space aesthetic with stars and nebula colors.',
  },
  {
    id: 'platformer',
    name: '3D Platformer',
    category: 'Platformer',
    description: 'Precision 3D platformer. Moving platforms, bounce pads, coin collection, timer challenge. Mario 64 inspired.',
    tags: ['Platformer', '3D', 'Jumping'],
    gradient: 'from-pink-900/60 to-rose-900/40',
    icon: '🌟',
    prompt: 'Create a 3D precision platformer like Mario 64. Third person camera, WASD move, Space jump (hold for higher), double-jump, wall-jump. Colorful floating island level with: small starting platform, series of moving platforms (some rotate, some slide), narrow beam sections, bounce pads that launch player high, spinning obstacle bars to dodge. 20 shiny coins to collect spread across platforms. Timer counts down from 120 seconds — collect all coins before time runs out. Fall off = respawn at last checkpoint. Upbeat colorful aesthetic, rainbow bridge finale.',
  },
  {
    id: 'survival',
    name: 'Survival Horror',
    category: 'Horror',
    description: 'Dark corridors, limited flashlight, 5 monster enemies that hunt by sound. Find the exit key. Tense atmosphere.',
    tags: ['Horror', 'Survival', 'Dark'],
    gradient: 'from-gray-900/60 to-zinc-900/40',
    icon: '👁️',
    prompt: 'Create a survival horror game. First person perspective, flashlight that drains battery (find battery pickups). Dark abandoned facility level with narrow corridors and locked rooms. 5 monster enemies — tall pale creatures with glowing red eyes that hunt by sound (running = loud). Player has no weapon — only dodge/hide. Find 3 key cards to unlock the exit door. Heartbeat sound effect when monster is close. Jumpscare sound on monster contact (lose 1 of 3 lives). Tense atmospheric fog, flickering lights, shadow-heavy aesthetic. Win by escaping.',
  },
]

interface TemplateSelectorProps {
  onSelect: (template: GameTemplate3D) => void
  onCustom: () => void
}

export function TemplateSelector3D({ onSelect, onCustom }: TemplateSelectorProps) {
  const categories = [...new Set(TEMPLATES_3D.map((t) => t.category))]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 bg-[#080810]/95 backdrop-blur-sm overflow-y-auto no-scrollbar"
    >
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-base font-light text-white/90 tracking-tight">New 3D Game</h2>
            <p className="text-[10px] font-light text-white/35 mt-0.5">
              Choose a template or describe your own game in the chat
            </p>
          </div>
          <button
            onClick={onCustom}
            className="text-[10px] font-light text-primary/60 hover:text-primary border border-primary/20 hover:border-primary/40 px-3 py-1.5 rounded-lg transition-all"
          >
            Custom →
          </button>
        </div>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="px-6 mb-5">
          <p className="text-[8px] font-medium text-white/25 uppercase tracking-widest mb-2">{cat}</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES_3D.filter((t) => t.category === cat).map((template) => (
              <TemplateCard key={template.id} template={template} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}

      <div className="h-4" />
    </motion.div>
  )
}

function TemplateCard({ template, onSelect }: { template: GameTemplate3D; onSelect: (t: GameTemplate3D) => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(template)}
      className={`relative text-left rounded-xl border border-white/8 bg-gradient-to-br ${template.gradient} hover:border-white/20 transition-all overflow-hidden group p-3`}
    >
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none flex-shrink-0">{template.icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-white/90 leading-tight">{template.name}</p>
          <p className="text-[9px] font-light text-white/45 mt-1 leading-relaxed line-clamp-2">
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {template.tags.map((tag) => (
              <span key={tag} className="text-[7px] font-medium text-white/30 bg-white/8 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-medium text-white/50">Generate →</span>
      </div>
    </motion.button>
  )
}
