use anchor_lang::prelude::*;

declare_id!("DyQYRqHBVVX1FghxSLPX8VCPvd8JFdBWAMvCFEBVTVb6");

#[program]
pub mod game_registry {
    use super::*;

    pub fn register_game(
        ctx: Context<RegisterGame>,
        game_id: u64,
        name: String,
        description: String,
        thumbnail_uri: String,
        slug: String,
        tip_jar: Pubkey,
        leaderboard: Pubkey,
        reward_mint: Pubkey,
    ) -> Result<()> {
        require!(name.len() <= 64, GameRegistryError::NameTooLong);
        require!(description.len() <= 256, GameRegistryError::DescriptionTooLong);
        require!(thumbnail_uri.len() <= 128, GameRegistryError::UriTooLong);
        require!(slug.len() <= 32, GameRegistryError::SlugTooLong);

        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        game.id = game_id;
        game.creator = ctx.accounts.creator.key();
        game.name = name;
        game.description = description;
        game.thumbnail_uri = thumbnail_uri;
        game.slug = slug;
        game.tip_jar = tip_jar;
        game.leaderboard = leaderboard;
        game.reward_mint = reward_mint;
        game.play_count = 0;
        game.active = true;
        game.created_at = clock.unix_timestamp;
        game.bump = ctx.bumps.game;

        msg!("Game registered: id={}", game_id);
        Ok(())
    }

    pub fn increment_play_count(ctx: Context<IncrementPlayCount>, _game_id: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.play_count = game.play_count.saturating_add(1);
        Ok(())
    }

    pub fn deactivate_game(ctx: Context<DeactivateGame>, _game_id: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require!(
            game.creator == ctx.accounts.creator.key(),
            GameRegistryError::Unauthorized
        );
        game.active = false;
        Ok(())
    }
}

// ─── Accounts ───────────────────────────────────────────────────────────────

#[account]
pub struct GameEntry {
    pub id: u64,
    pub creator: Pubkey,
    pub name: String,           // max 64
    pub description: String,    // max 256
    pub thumbnail_uri: String,  // max 128
    pub slug: String,           // max 32
    pub tip_jar: Pubkey,
    pub leaderboard: Pubkey,
    pub reward_mint: Pubkey,
    pub play_count: u64,
    pub active: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl GameEntry {
    // 8 discriminator + 8 id + 32 creator + (4+64) name + (4+256) desc
    // + (4+128) uri + (4+32) slug + 32*3 pubkeys + 8 play_count
    // + 1 active + 8 created_at + 1 bump
    pub const LEN: usize = 8 + 8 + 32 + 68 + 260 + 132 + 36 + 96 + 8 + 1 + 8 + 1;
}

// ─── Contexts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct RegisterGame<'info> {
    #[account(
        init,
        payer = creator,
        space = GameEntry::LEN,
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, GameEntry>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct IncrementPlayCount<'info> {
    #[account(
        mut,
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump = game.bump
    )]
    pub game: Account<'info, GameEntry>,
    // permissionless — anyone can increment (platform calls this)
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct DeactivateGame<'info> {
    #[account(
        mut,
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump = game.bump,
        has_one = creator
    )]
    pub game: Account<'info, GameEntry>,

    pub creator: Signer<'info>,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum GameRegistryError {
    #[msg("Game name must be 64 characters or less")]
    NameTooLong,
    #[msg("Description must be 256 characters or less")]
    DescriptionTooLong,
    #[msg("URI must be 128 characters or less")]
    UriTooLong,
    #[msg("Slug must be 32 characters or less")]
    SlugTooLong,
    #[msg("Only the game creator can perform this action")]
    Unauthorized,
}
