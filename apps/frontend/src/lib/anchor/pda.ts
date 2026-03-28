import { PublicKey } from '@solana/web3.js'

function toLeBytes(n: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(n)
  return buf
}

export const GAME_REGISTRY_PROGRAM_ID = new PublicKey('DyQYRqHBVVX1FghxSLPX8VCPvd8JFdBWAMvCFEBVTVb6')
export const LEADERBOARD_PROGRAM_ID = new PublicKey('7ytj4MrhqZhzSJLLQNSSVpHB24Tpma2GmQycqXdjhYu6')
export const REWARD_VAULT_PROGRAM_ID = new PublicKey('2dRKWxJZWKSE32KZ9qgEhHg4Jfq6tZH4KF4ayChtXtmm')
export const TIP_JAR_PROGRAM_ID = new PublicKey('9c2GADAaWZsXcRojw1aWfnZuRgyAWAnrpXS8NNLcbrAN')

export function getGamePDA(gameId: bigint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('game'), toLeBytes(gameId)],
    GAME_REGISTRY_PROGRAM_ID,
  )
}

export function getLeaderboardPDA(gameId: bigint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('leaderboard'), toLeBytes(gameId)],
    LEADERBOARD_PROGRAM_ID,
  )
}

export function getCommitmentPDA(player: PublicKey, gameId: bigint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('commit'), player.toBytes(), toLeBytes(gameId)],
    LEADERBOARD_PROGRAM_ID,
  )
}

export function getRewardVaultPDA(gameId: bigint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), toLeBytes(gameId)],
    REWARD_VAULT_PROGRAM_ID,
  )
}

export function getRewardMintPDA(gameId: bigint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('reward_mint'), toLeBytes(gameId)],
    REWARD_VAULT_PROGRAM_ID,
  )
}

export function getTipJarPDA(creator: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('tip_jar'), creator.toBytes()],
    TIP_JAR_PROGRAM_ID,
  )
}
