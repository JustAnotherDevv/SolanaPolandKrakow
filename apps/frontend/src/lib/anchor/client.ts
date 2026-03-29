/**
 * Anchor program clients.
 * Simplified implementations for hackathon — real Anchor IDL integration for production.
 */
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import { getLeaderboardPDA } from './pda'

export interface ScoreEntry {
  player: string
  score: number
  timestamp: number
}

export interface LeaderboardData {
  gameId: number
  entries: ScoreEntry[]
  totalSubmissions: number
}

/** Send SOL payment for a game (pay-to-play gate) */
export async function payForGame(
  connection: Connection,
  wallet: AnchorWallet,
  recipientAddress: string,
  amountSol: number,
): Promise<string> {
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL)
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(recipientAddress),
      lamports,
    }),
  )
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = wallet.publicKey
  const signed = await wallet.signTransaction(tx)
  const sig = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(sig, 'confirmed')
  return sig
}

/** Fetch leaderboard account data — tries on-chain first, falls back to empty */
export async function fetchLeaderboard(
  connection: Connection,
  gameIdOrAddress: bigint | string,
): Promise<LeaderboardData | null> {
  try {
    // Accept either a gameId (bigint → derive PDA) or a direct address (string)
    const pda = typeof gameIdOrAddress === 'string'
      ? new PublicKey(gameIdOrAddress)
      : getLeaderboardPDA(gameIdOrAddress)[0]
    const info = await connection.getAccountInfo(pda)
    if (!info) return null

    // Parse the leaderboard account data
    // Layout: 8 (discriminator) + 8 (game_id) + 4 (entries len) + entries * (32 + 8 + 8) + 8 (total_submissions)
    const data = info.data
    const gameId = Number(data.readBigUInt64LE(8))
    const entriesLen = data.readUInt32LE(16)
    const entries: ScoreEntry[] = []

    let offset = 20
    for (let i = 0; i < entriesLen && i < 10; i++) {
      const playerBytes = data.subarray(offset, offset + 32)
      const player = new PublicKey(playerBytes).toBase58()
      offset += 32
      const score = Number(data.readBigUInt64LE(offset))
      offset += 8
      const timestamp = Number(data.readBigInt64LE(offset))
      offset += 8
      if (score > 0) {
        entries.push({ player, score, timestamp })
      }
    }

    const totalSubmissions = Number(data.readBigUInt64LE(offset))

    return {
      gameId,
      entries: entries.sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 })),
      totalSubmissions,
    }
  } catch {
    return null
  }
}

/** Commit score hash on-chain before reveal */
export async function commitScore(
  connection: Connection,
  wallet: AnchorWallet,
  gameId: bigint,
  commitmentHash: Uint8Array,
): Promise<string> {
  // TODO: replace with leaderboard program instruction after IDL generation
  void connection
  void wallet
  void gameId
  void commitmentHash
  throw new Error('Leaderboard program not deployed yet — run `anchor build` first')
}

/** Reveal score and insert into leaderboard */
export async function revealScore(
  connection: Connection,
  wallet: AnchorWallet,
  gameId: bigint,
  score: bigint,
  nonce: Uint8Array,
): Promise<string> {
  void connection
  void wallet
  void gameId
  void score
  void nonce
  throw new Error('Leaderboard program not deployed yet — run `anchor build` first')
}

/** Claim SPL token reward for score tier */
export async function claimReward(
  connection: Connection,
  wallet: AnchorWallet,
  gameId: bigint,
  score: bigint,
): Promise<string> {
  void connection
  void wallet
  void gameId
  void score
  throw new Error('RewardVault program not deployed yet — run `anchor build` first')
}

/** Send SOL tip to creator's tip jar */
export async function tipSol(
  connection: Connection,
  wallet: AnchorWallet,
  creatorAddress: string,
  lamports: number,
): Promise<string> {
  void creatorAddress
  // Simple transfer for now — replace with tip_jar instruction after IDL generation
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(creatorAddress),
      lamports,
    }),
  )
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = wallet.publicKey
  const signed = await wallet.signTransaction(tx)
  return connection.sendRawTransaction(signed.serialize())
}

/** Register a new game on-chain */
export async function registerGame(
  _connection: Connection,
  _wallet: AnchorWallet,
  _params: {
    gameId: bigint
    name: string
    description: string
    slug: string
    thumbnailUri: string
    tipJar: PublicKey
    leaderboard: PublicKey
    rewardMint: PublicKey
  },
): Promise<string> {
  throw new Error('GameRegistry program not deployed yet — run `anchor build` first')
}
