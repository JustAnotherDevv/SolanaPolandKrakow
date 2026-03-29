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
          name: { type: 'string', description: 'Asset identifier e.g. "player", "enemy_slime"' },
          description: { type: 'string', description: 'Detailed visual description of the sprite' },
          style: { type: 'string', description: 'Art style e.g. "pixel art", "cartoon", "retro 16-bit"' },
          width: { type: 'number', default: 256 },
          height: { type: 'number', default: 256 },
        },
        required: ['name', 'description'],
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
          name: { type: 'string', description: 'Asset identifier e.g. "background_forest"' },
          description: { type: 'string', description: 'Detailed description of the background scene' },
          width: { type: 'number', default: 512 },
          height: { type: 'number', default: 256 },
        },
        required: ['name', 'description'],
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
          type: { type: 'string', description: 'Structure type: "enemy", "item", "level", "ability"' },
          name: { type: 'string', description: 'Name of this entry e.g. "Goblin", "Health Potion"' },
          data: { type: 'object', description: 'Structured data (stats, effects, layout etc.)' },
        },
        required: ['type', 'name', 'data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_assets',
      description: 'List all generated assets for this game',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_structures',
      description: 'Get all or filtered game structures for this game',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Optional filter: "enemy", "item", "level", "ability"' },
        },
        required: [],
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
  // ─── Solana Integration Tools ──────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'add_payment_gate',
      description: 'Add a SOL payment gate — players must pay before playing. Injects `await sdk.requestPayment(amount)` into game constructor.',
      parameters: {
        type: 'object',
        properties: {
          amount_sol: { type: 'number', description: 'Amount in SOL (e.g. 0.1)' },
          recipient: { type: 'string', description: 'Recipient wallet address (optional)' },
        },
        required: ['amount_sol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_shop_item',
      description: 'Add an in-game shop item purchasable with SOL. Call multiple times for multiple items.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Item name e.g. "Diamond Sword"' },
          description: { type: 'string', description: 'Item description' },
          price_sol: { type: 'number', description: 'Price in SOL (e.g. 0.05)' },
          category: { type: 'string', enum: ['weapon', 'armor', 'powerup', 'cosmetic', 'other'], description: 'Item category' },
        },
        required: ['name', 'price_sol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_nft_reward',
      description: 'Add an NFT minting reward at a specific game event',
      parameters: {
        type: 'object',
        properties: {
          trigger: { type: 'string', enum: ['level_complete', 'high_score', 'achievement', 'boss_kill'], description: 'When to offer the NFT mint' },
          nft_name: { type: 'string', description: 'NFT name e.g. "Level 3 Conqueror"' },
          nft_description: { type: 'string', description: 'NFT description' },
        },
        required: ['trigger', 'nft_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_leaderboard',
      description: 'Add an on-chain leaderboard to the game',
      parameters: {
        type: 'object',
        properties: {
          position: { type: 'string', enum: ['endgame', 'pause_menu', 'both'], description: 'Where to show the leaderboard' },
        },
        required: ['position'],
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
      const { gameId, name, description, style, width = 256, height = 256 } = args as {
        gameId: string; name: string; description: string; style?: string; width?: number; height?: number
      }
      const prompt = spritePrompt(description, style ?? 'pixel art')
      emit({ type: 'generating', data: { name, type: 'sprite', prompt } })
      const imageBuffer = await generateImage(prompt, width as number, height as number, true)
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

    // ─── Solana Integration Tools ──────────────────────────────────────────────

    case 'add_payment_gate': {
      const amountSol = args.amount_sol as number
      const recipient = args.recipient as string | undefined
      const gameId = args.gameId as string
      const structureId = generateId()
      db.prepare(`INSERT INTO game_structures (id, game_id, type, name, data, created_at)
        VALUES (?, ?, 'payment_gate', 'Payment Gate', ?, ?)`).run(
        structureId, gameId, JSON.stringify({ amountSol, recipient }), Date.now()
      )
      emit({ type: 'agent_step', data: { message: `Payment gate: ${amountSol} SOL`, icon: '💰', step: 'solana' } })
      return {
        result: {
          instruction: `Add this to the Game constructor (before game starts):
\`\`\`javascript
this._paid = false
sdk.requestPayment(${amountSol}${recipient ? `, '${recipient}'` : ''}).then(() => {
  this._paid = true
  this.ready = true
}).catch(() => {})
\`\`\`
In the update loop, check \`if (!this._paid) return\` to block gameplay until payment.`,
        },
      }
    }

    case 'add_shop_item': {
      const { gameId, name, description = '', price_sol, category = 'other' } = args as {
        gameId: string; name: string; description?: string; price_sol: number; category?: string
      }
      const itemId = generateId()
      db.prepare(`INSERT INTO game_shop_items (id, game_id, name, description, price_lamports, category)
        VALUES (?, ?, ?, ?, ?, ?)`).run(itemId, gameId, name, description, Math.round(price_sol * 1e9), category)
      emit({ type: 'agent_step', data: { message: `Shop item: ${name} (${price_sol} SOL)`, icon: '🛒', step: 'solana' } })
      return {
        result: {
          itemId,
          instruction: `Shop item "${name}" registered. Use sdk.showShop([{ id: '${itemId}', name: '${name}', description: '${description}', priceSol: ${price_sol}, category: '${category}' }])`,
        },
      }
    }

    case 'add_nft_reward': {
      const { gameId, trigger, nft_name, nft_description = '' } = args as {
        gameId: string; trigger: string; nft_name: string; nft_description?: string
      }
      const structureId = generateId()
      db.prepare(`INSERT INTO game_structures (id, game_id, type, name, data, created_at)
        VALUES (?, ?, 'nft_reward', ?, ?, ?)`).run(structureId, gameId, nft_name, JSON.stringify({ trigger }), Date.now())
      emit({ type: 'agent_step', data: { message: `NFT reward: ${nft_name} on ${trigger}`, icon: '✨', step: 'solana' } })
      return {
        result: {
          instruction: `At ${trigger}: sdk.mintNFT({ name: '${nft_name}', description: '${nft_description}', image: '' })`,
        },
      }
    }

    case 'add_leaderboard': {
      const { gameId, position } = args as { gameId: string; position: string }
      const structureId = generateId()
      db.prepare(`INSERT INTO game_structures (id, game_id, type, name, data, created_at)
        VALUES (?, ?, 'leaderboard', 'Leaderboard', ?, ?)`).run(structureId, gameId, JSON.stringify({ position }), Date.now())
      emit({ type: 'agent_step', data: { message: `Leaderboard: ${position}`, icon: '🏆', step: 'solana' } })
      return {
        result: {
          instruction: `At ${position}: sdk.submitScore(this.score).then(() => sdk.showLeaderboard())`,
        },
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
