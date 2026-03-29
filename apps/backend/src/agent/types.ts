export interface AgentStep {
  type:
    | 'agent_step'
    | 'search_done'
    | 'generating'
    | 'asset_ready'
    | 'structure'
    | 'coding'
    | 'code_chunk'
    | 'code_reset'
    | 'done'
    | 'error'
  data: Record<string, unknown>
}

export type StepEmitter = (step: AgentStep) => void

export interface Asset {
  id: string
  gameId: string
  name: string
  type: string
  prompt: string
  width: number
  height: number
  createdAt: number
  url: string
}

export interface GameStructure {
  id: string
  gameId: string
  type: string
  name: string
  data: unknown
  createdAt: number
}
