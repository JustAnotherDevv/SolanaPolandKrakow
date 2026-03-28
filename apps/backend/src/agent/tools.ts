import { db, generateId } from '../db/client'
import { webSearch } from '../lib/search'
import { generateImage, spritePrompt, backgroundPrompt } from '../lib/imageGen'
import type { ToolDefinition } from '../lib/openrouter'
import type { StepEmitter, Asset, GameStructure } from './types'

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export const TOOL_DEFS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for game design references, mechanics, and visual style ideas',
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
      name: 'generate_sprite',
      description: 'Generate a sprite image for a character, enemy, or item using AI',
      parameters: {
        type: 'object',
        properties: {
          gameId: { type: 'string' },
          name: { type: 'string', description: 'Asset identifier e.g. "player", "enemy_slime"' },
          description: { type: 'string', description: 'Detailed visual description of the sprite' },
          style: { type: 'string', description: 'Art style e.g. "pixel art", "cartoon", "retro 16-bit"' },
          width: { type: 'number', default: 64 },
          height: { type: 'number', default: 64 },
        },
        required: ['gameId', 'name', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_background',
      description: 'Generate a background image for the game scene',
      parameters: {
        type: 'object',
        properties: {
          gameId: { type: 'string' },
          name: { type: 'string', description: 'Asset identifier e.g. "background_forest"' },
          description: { type: 'string', description: 'Detailed description of the background scene' },
          width: { type: 'number', default: 512 },
          height: { type: 'number', default: 256 },
        },
        required: ['gameId', 'name', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'define_structure',
      description: 'Save structured game data: enemy stats, item effects, level layout, ability definitions',
      parameters: {
        type: 'object',
        properties: {
          gameId: { type: 'string' },
          type: { type: 'string', description: 'Structure type: "enemy", "item", "level", "ability"' },
          name: { type: 'string', description: 'Name of this entry e.g. "Goblin", "Health Potion"' },
          data: { type: 'object', description: 'Structured data (stats, effects, layout etc.)' },
        },
        required: ['gameId', 'type', 'name', 'data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_assets',
      description: 'List all generated assets for a game',
      parameters: {
        type: 'object',
        properties: {
          gameId: { type: 'string' },
        },
        required: ['gameId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_structures',
      description: 'Get all or filtered game structures for a game',
      parameters: {
        type: 'object',
        properties: {
          gameId: { type: 'string' },
          type: { type: 'string', description: 'Optional filter: "enemy", "item", "level", "ability"' },
        },
        required: ['gameId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_game_code',
      description: 'Write the complete final game JavaScript code. This ends the agent loop.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Complete JavaScript game code (class Game {...})' },
          name: { type: 'string', description: 'Short game name e.g. "Cave Platformer"' },
        },
        required: ['code'],
      },
    },
  },
]

// ─── Tool Handlers ────────────────────────────────────────────────────────────

export async function executeTool(
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

    case 'generate_sprite': {
      const { gameId, name, description, style, width = 64, height = 64 } = args as {
        gameId: string; name: string; description: string; style?: string; width?: number; height?: number
      }
      const prompt = spritePrompt(description, style ?? 'pixel art')
      emit({ type: 'generating', data: { name, type: 'sprite', prompt } })
      const imageBuffer = await generateImage(prompt, width as number, height as number)
      const assetId = generateId()
      const now = Date.now()
      db.prepare(`INSERT INTO assets (id, game_id, name, type, prompt, data, width, height, created_at)
        VALUES (?, ?, ?, 'sprite', ?, ?, ?, ?, ?)`).run(
        assetId, gameId, name, prompt, imageBuffer, width, height, now
      )
      const url = `http://localhost:${process.env.PORT ?? 3001}/api/assets/${assetId}`
      emit({ type: 'asset_ready', data: { assetId, name, url, type: 'sprite' } })
      return { result: { assetId, url, name } }
    }

    case 'generate_background': {
      const { gameId, name, description, width = 512, height = 256 } = args as {
        gameId: string; name: string; description: string; width?: number; height?: number
      }
      const prompt = backgroundPrompt(description)
      emit({ type: 'generating', data: { name, type: 'background', prompt } })
      const imageBuffer = await generateImage(prompt, width as number, height as number)
      const assetId = generateId()
      const now = Date.now()
      db.prepare(`INSERT INTO assets (id, game_id, name, type, prompt, data, width, height, created_at)
        VALUES (?, ?, ?, 'background', ?, ?, ?, ?, ?)`).run(
        assetId, gameId, name, prompt, imageBuffer, width, height, now
      )
      const url = `http://localhost:${process.env.PORT ?? 3001}/api/assets/${assetId}`
      emit({ type: 'asset_ready', data: { assetId, name, url, type: 'background' } })
      return { result: { assetId, url, name } }
    }

    case 'define_structure': {
      const { gameId, type, name, data } = args as {
        gameId: string; type: string; name: string; data: unknown
      }
      const structureId = generateId()
      const now = Date.now()
      db.prepare(`INSERT INTO game_structures (id, game_id, type, name, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`).run(
        structureId, gameId, type, name, JSON.stringify(data), now
      )
      emit({ type: 'structure', data: { structureId, type, name, data } })
      return { result: { structureId, type, name } }
    }

    case 'list_assets': {
      const { gameId } = args as { gameId: string }
      const rows = db.prepare(`SELECT id, game_id, name, type, prompt, width, height, created_at
        FROM assets WHERE game_id = ? ORDER BY created_at ASC`).all(gameId) as Array<{
          id: string; game_id: string; name: string; type: string; prompt: string
          width: number; height: number; created_at: number
        }>
      const assets: Asset[] = rows.map((r) => ({
        id: r.id,
        gameId: r.game_id,
        name: r.name,
        type: r.type,
        prompt: r.prompt,
        width: r.width,
        height: r.height,
        createdAt: r.created_at,
        url: `http://localhost:${process.env.PORT ?? 3001}/api/assets/${r.id}`,
      }))
      return { result: assets }
    }

    case 'get_structures': {
      const { gameId, type } = args as { gameId: string; type?: string }
      const rows = type
        ? db.prepare(`SELECT * FROM game_structures WHERE game_id = ? AND type = ? ORDER BY created_at ASC`).all(gameId, type)
        : db.prepare(`SELECT * FROM game_structures WHERE game_id = ? ORDER BY created_at ASC`).all(gameId)
      const structures: GameStructure[] = (rows as Array<{
        id: string; game_id: string; type: string; name: string; data: string; created_at: number
      }>).map((r) => ({
        id: r.id,
        gameId: r.game_id,
        type: r.type,
        name: r.name,
        data: JSON.parse(r.data),
        createdAt: r.created_at,
      }))
      return { result: structures }
    }

    case 'write_game_code': {
      const code = args.code as string
      const name = (args.name as string | undefined) ?? 'AI Game'
      emit({ type: 'coding', data: { message: 'Finalizing game code...' } })
      return { result: { success: true }, done: true, code, name }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
