use anchor_lang::prelude::*;

declare_id!("7ytj4MrhqZhzSJLLQNSSVpHB24Tpma2GmQycqXdjhYu6");

const MAX_ENTRIES: usize = 10;
const REVEAL_WINDOW_SECS: i64 = 300; // 5 minutes

#[program]
pub mod leaderboard {
    use super::*;

    pub fn init_leaderboard(ctx: Context<InitLeaderboard>, game_id: u64) -> Result<()> {
        let lb = &mut ctx.accounts.leaderboard;
        lb.game_id = game_id;
        lb.entries = Vec::new();
        lb.total_submissions = 0;
        lb.bump = ctx.bumps.leaderboard;
        msg!("Leaderboard initialized for game_id={}", game_id);
        Ok(())
    }

    /// Phase 1: Player commits a hash before the game starts.
    /// hash = SHA256(score_le_bytes || nonce_32_bytes)
    pub fn commit_score(
        ctx: Context<CommitScore>,
        game_id: u64,
        commitment_hash: [u8; 32],
    ) -> Result<()> {
        let commitment = &mut ctx.accounts.commitment;
        let clock = Clock::get()?;

        commitment.player = ctx.accounts.player.key();
        commitment.game_id = game_id;
        commitment.commitment_hash = commitment_hash;
        commitment.revealed = false;
        commitment.final_score = 0;
        commitment.created_at = clock.unix_timestamp;
        commitment.bump = ctx.bumps.commitment;

        msg!("Score commitment recorded for player={}", ctx.accounts.player.key());
        Ok(())
    }

    /// Phase 2: Player reveals score + nonce. Program verifies hash, inserts into leaderboard.
    pub fn reveal_score(
        ctx: Context<RevealScore>,
        _game_id: u64,
        score: u64,
        nonce: [u8; 32],
    ) -> Result<()> {
        let commitment = &mut ctx.accounts.commitment;
        let clock = Clock::get()?;

        require!(!commitment.revealed, LeaderboardError::AlreadyRevealed);
        require!(
            clock.unix_timestamp - commitment.created_at <= REVEAL_WINDOW_SECS,
            LeaderboardError::RevealWindowClosed
        );

        // Verify hash: SHA256(score_le || nonce)
        let mut data = [0u8; 40]; // 8 bytes score + 32 bytes nonce
        data[..8].copy_from_slice(&score.to_le_bytes());
        data[8..].copy_from_slice(&nonce);
        let computed = anchor_lang::solana_program::hash::hash(&data);
        require!(
            computed.to_bytes() == commitment.commitment_hash,
            LeaderboardError::InvalidScoreProof
        );

        commitment.final_score = score;
        commitment.revealed = true;

        // Insert into leaderboard
        let lb = &mut ctx.accounts.leaderboard;
        lb.total_submissions = lb.total_submissions.saturating_add(1);

        let player = commitment.player;
        lb.entries.retain(|e| e.player != player);

        lb.entries.push(ScoreEntry {
            player,
            score,
            timestamp: clock.unix_timestamp,
        });

        lb.entries.sort_by(|a, b| b.score.cmp(&a.score));
        lb.entries.truncate(MAX_ENTRIES);

        msg!("Score revealed: player={} score={}", player, score);
        Ok(())
    }
}

// ─── Accounts ───────────────────────────────────────────────────────────────

#[account]
pub struct Leaderboard {
    pub game_id: u64,
    pub entries: Vec<ScoreEntry>,
    pub total_submissions: u64,
    pub bump: u8,
}

impl Leaderboard {
    // 8 disc + 8 game_id + (4 + 10*49) entries_vec + 8 total + 1 bump
    pub const LEN: usize = 8 + 8 + (4 + MAX_ENTRIES * 49) + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoreEntry {
    pub player: Pubkey,  // 32
    pub score: u64,      // 8
    pub timestamp: i64,  // 8
    // padding for alignment: 1
}

#[account]
pub struct ScoreCommitment {
    pub player: Pubkey,
    pub game_id: u64,
    pub commitment_hash: [u8; 32],
    pub revealed: bool,
    pub final_score: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl ScoreCommitment {
    // 8 disc + 32 player + 8 game_id + 32 hash + 1 revealed + 8 score + 8 created + 1 bump
    pub const LEN: usize = 8 + 32 + 8 + 32 + 1 + 8 + 8 + 1;
}

// ─── Contexts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct InitLeaderboard<'info> {
    #[account(
        init,
        payer = authority,
        space = Leaderboard::LEN,
        seeds = [b"leaderboard", game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub leaderboard: Account<'info, Leaderboard>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CommitScore<'info> {
    #[account(
        init,
        payer = player,
        space = ScoreCommitment::LEN,
        seeds = [b"commit", player.key().as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub commitment: Account<'info, ScoreCommitment>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct RevealScore<'info> {
    #[account(
        mut,
        seeds = [b"leaderboard", game_id.to_le_bytes().as_ref()],
        bump = leaderboard.bump
    )]
    pub leaderboard: Account<'info, Leaderboard>,

    #[account(
        mut,
        seeds = [b"commit", player.key().as_ref(), game_id.to_le_bytes().as_ref()],
        bump = commitment.bump,
        constraint = commitment.player == player.key() @ LeaderboardError::Unauthorized,
        constraint = commitment.game_id == game_id @ LeaderboardError::GameIdMismatch,
        close = player
    )]
    pub commitment: Account<'info, ScoreCommitment>,

    pub player: Signer<'info>,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum LeaderboardError {
    #[msg("Score has already been revealed")]
    AlreadyRevealed,
    #[msg("Reveal window has closed (5 min limit)")]
    RevealWindowClosed,
    #[msg("Score proof does not match commitment")]
    InvalidScoreProof,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Game ID mismatch")]
    GameIdMismatch,
}
