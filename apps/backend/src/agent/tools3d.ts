import { db, generateId } from '../db/client'
import { webSearch } from '../lib/search'
import { generateImage } from '../lib/imageGen'
import type { ToolDefinition } from '../lib/openrouter'
import type { StepEmitter } from './types'

// ─── Scene accumulator ────────────────────────────────────────────────────────
// One per active generation; cleared when write_3d_game_code is called

export interface SceneObject {
  id: string
  name: string
  type: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  mesh?: { geometry: string; color: string }
  controller?: Record<string, unknown>
  abilities?: string[]
  items?: string[]
}

export interface Scene3D {
  settings: {
    skyColor: string
    ambientColor: string
    fog?: { color: string; near: number; far: number }
    gravity: number
  }
  objects: SceneObject[]
}

const sceneAccumulators = new Map<string, Scene3D>()

function getScene(gameId: string): Scene3D {
  if (!sceneAccumulators.has(gameId)) {
    sceneAccumulators.set(gameId, {
      settings: { skyColor: '#1a0a2e', ambientColor: '#404060', gravity: -9.8 },
      objects: [],
    })
  }
  return sceneAccumulators.get(gameId)!
}

export function clearScene(gameId: string) {
  sceneAccumulators.delete(gameId)
}

/** Pre-populate the scene accumulator with existing scene data (for modify runs) */
export function initSceneFromExisting(gameId: string, scene: Scene3D) {
  // Deep clone so mutations don't affect the source
  sceneAccumulators.set(gameId, JSON.parse(JSON.stringify(scene)))
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export const TOOL_DEFS_3D: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for game design references, 3D mechanics, and visual style ideas',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          num_results: { type: 'number', description: 'Number of results (1-10, default 5)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_texture',
      description: 'Generate a texture or icon image for use in the 3D game (items, HUD icons, etc.)',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Asset identifier e.g. "health_icon", "sword_icon"' },
          description: { type: 'string', description: 'Detailed visual description' },
          size: { type: 'number', description: 'Square size in pixels (default 256)' },
        },
        required: ['name', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_scene_settings',
      description: 'Configure global scene settings: sky color, ambient light, fog, gravity',
      parameters: {
        type: 'object',
        properties: {
          skyColor: { type: 'string', description: 'Hex color for sky/background e.g. "#1a0a2e"' },
          ambientColor: { type: 'string', description: 'Hex color for ambient light e.g. "#404060"' },
          fog: {
            type: 'object',
            description: 'Optional distance fog',
            properties: {
              color: { type: 'string' },
              near: { type: 'number' },
              far: { type: 'number' },
            },
          },
          gravity: { type: 'number', description: 'Gravity value in m/s² (default -9.8)' },
        },
        required: ['skyColor', 'ambientColor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'place_object',
      description: 'Place a game object in the 3D scene. Call this for every object: player, enemies, terrain, lights, items, triggers.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Unique descriptive name e.g. "Player", "Goblin_1", "Wall_North"' },
          type: {
            type: 'string',
            enum: ['PlayerController', 'NPCController', 'StaticMesh', 'DirectionalLight', 'PointLight', 'AmbientLight', 'HemisphereLight', 'SpotLight', 'Item', 'Trigger', 'GameController', 'Fog', 'Sky', 'PostFX'],
            description: 'Object type determines behavior',
          },
          position: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
            required: ['x', 'y', 'z'],
          },
          rotation: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          },
          scale: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          },
          mesh: {
            type: 'object',
            description: 'Visual mesh (omit for lights/triggers/GameController)',
            properties: {
              geometry: { type: 'string', enum: ['box', 'sphere', 'capsule', 'cylinder', 'plane'] },
              color: { type: 'string', description: 'Hex color' },
            },
          },
          controller: {
            type: 'object',
            description: 'Type-specific properties: speed, health, damage, behavior, etc.',
          },
          abilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Ability names this object can use',
          },
        },
        required: ['name', 'type', 'position'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'define_ability',
      description: 'Define a player or NPC ability (attack, dodge, special move)',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Ability name e.g. "Sword Slash", "Fireball"' },
          data: {
            type: 'object',
            description: 'Ability properties',
            properties: {
              type: { type: 'string', enum: ['melee', 'ranged', 'aoe', 'buff', 'special'] },
              damage: { type: 'number' },
              range: { type: 'number' },
              cooldown: { type: 'number', description: 'Seconds between uses' },
              key: { type: 'string', description: 'Keyboard key e.g. "F", "Space", "1"' },
            },
          },
        },
        required: ['name', 'data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'define_item',
      description: 'Define a collectible item type',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Item name e.g. "Health Potion", "Speed Boost"' },
          data: {
            type: 'object',
            properties: {
              effect: { type: 'string', enum: ['heal', 'ammo', 'powerup', 'key', 'score'] },
              amount: { type: 'number' },
              color: { type: 'string' },
              duration: { type: 'number', description: 'Duration in seconds for timed effects' },
            },
          },
        },
        required: ['name', 'data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_3d_game_code',
      description: 'Write the complete Three.js game code as a Game3D class. This ends the agent loop. Use the scene objects you placed as reference for what to implement.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Complete JavaScript code — only the Game3D class and any helpers' },
          name: { type: 'string', description: 'Short game name e.g. "Dungeon Crawler 3D"' },
        },
        required: ['code'],
      },
    },
  },
]

// ─── Tool Handlers ────────────────────────────────────────────────────────────

export async function executeTool3D(
  toolName: string,
  args: Record<string, unknown>,
  emit: StepEmitter,
): Promise<{ result: unknown; done?: boolean; code?: string; name?: string }> {
  switch (toolName) {
    case 'web_search': {
      const query = args.query as string
      const num = (args.num_results as number | undefined) ?? 5
      emit({ type: 'agent_step', data: { message: `Researching: "${query}"`, icon: '🔍', step: 'search' } })
      const results = await webSearch(query, num)
      const snippets = results.map((r) => ({ title: r.title, url: r.url, content: r.content.slice(0, 300) }))
      emit({ type: 'search_done', data: { query, snippets } })
      return { result: { snippets, summary: `Found ${snippets.length} results for "${query}"` } }
    }

    case 'generate_texture': {
      const { gameId, name, description, size = 256 } = args as {
        gameId: string; name: string; description: string; size?: number
      }
      const prompt = `game icon or texture of ${description}, flat design, vibrant colors, on dark background, no text, game asset`
      emit({ type: 'generating', data: { name, type: 'texture', prompt } })
      const imageBuffer = await generateImage(prompt, size as number, size as number, false)
      const assetId = generateId()
      const now = Date.now()
      db.prepare(`INSERT INTO assets (id, game_id, name, type, prompt, data, width, height, created_at)
        VALUES (?, ?, ?, 'texture', ?, ?, ?, ?, ?)`).run(
        assetId, gameId, name, prompt, imageBuffer, size, size, now
      )
      const url = `http://localhost:${process.env.PORT ?? 3001}/api/assets/${assetId}`
      emit({ type: 'asset_ready', data: { assetId, name, url, type: 'texture' } })
      return { result: { assetId, url, name } }
    }

    case 'set_scene_settings': {
      const { gameId, skyColor, ambientColor, fog, gravity = -9.8 } = args as {
        gameId: string; skyColor: string; ambientColor: string
        fog?: { color: string; near: number; far: number }; gravity?: number
      }
      const scene = getScene(gameId)
      scene.settings = { skyColor, ambientColor, fog, gravity }
      emit({ type: 'scene_update', data: { scene: JSON.parse(JSON.stringify(scene)) } })
      emit({ type: 'agent_step', data: { message: `Scene: ${skyColor} sky, gravity ${gravity}`, icon: '🌌', step: 'scene' } })
      return { result: { ok: true, settings: scene.settings } }
    }

    case 'place_object': {
      const { gameId, name, type, position, rotation = { x: 0, y: 0, z: 0 }, scale = { x: 1, y: 1, z: 1 }, mesh, controller, abilities } = args as {
        gameId: string; name: string; type: string
        position: { x: number; y: number; z: number }
        rotation?: { x: number; y: number; z: number }
        scale?: { x: number; y: number; z: number }
        mesh?: { geometry: string; color: string }
        controller?: Record<string, unknown>
        abilities?: string[]
      }
      const scene = getScene(gameId)
      const id = generateId()
      const obj: SceneObject = {
        id,
        name,
        type,
        position,
        rotation,
        scale,
        mesh,
        controller,
        abilities,
      }
      scene.objects.push(obj)
      emit({ type: 'scene_update', data: { scene: JSON.parse(JSON.stringify(scene)) } })
      emit({ type: 'agent_step', data: { message: `Placed ${type}: ${name}`, icon: getObjectIcon(type), step: 'place_object' } })
      return { result: { id, name, type } }
    }

    case 'define_ability': {
      const { gameId, name, data } = args as { gameId: string; name: string; data: unknown }
      const structureId = generateId()
      const now = Date.now()
      db.prepare(`INSERT INTO game_structures (id, game_id, type, name, data, created_at)
        VALUES (?, ?, 'ability', ?, ?, ?)`).run(structureId, gameId, name, JSON.stringify(data), now)
      emit({ type: 'structure', data: { structureId, type: 'ability', name, data } })
      return { result: { structureId, type: 'ability', name } }
    }

    case 'define_item': {
      const { gameId, name, data } = args as { gameId: string; name: string; data: unknown }
      const structureId = generateId()
      const now = Date.now()
      db.prepare(`INSERT INTO game_structures (id, game_id, type, name, data, created_at)
        VALUES (?, ?, 'item', ?, ?, ?)`).run(structureId, gameId, name, JSON.stringify(data), now)
      emit({ type: 'structure', data: { structureId, type: 'item', name, data } })
      return { result: { structureId, type: 'item', name } }
    }

    case 'write_3d_game_code': {
      const code = args.code as string
      const name = (args.name as string | undefined) ?? 'AI 3D Game'
      const gameId = args.gameId as string
      // Save the scene JSON to DB
      const scene = getScene(gameId)
      db.prepare(`UPDATE games SET scene = ? WHERE id = ?`).run(JSON.stringify(scene), gameId)
      clearScene(gameId)
      emit({ type: 'coding', data: { message: 'Finalizing 3D game code...' } })
      return { result: { success: true }, done: true, code, name }
    }

    default:
      throw new Error(`Unknown 3D tool: ${toolName}`)
  }
}

function getObjectIcon(type: string): string {
  const icons: Record<string, string> = {
    PlayerController: '🧍',
    NPCController: '🤖',
    StaticMesh: '⬛',
    DirectionalLight: '☀️',
    PointLight: '💡',
    AmbientLight: '🔆',
    HemisphereLight: '🌤',
    SpotLight: '🔦',
    Item: '💎',
    Trigger: '🔲',
    GameController: '⚙️',
    Fog: '🌫',
    Sky: '🌌',
    PostFX: '✨',
  }
  return icons[type] ?? '📦'
}
