use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("2dRKWxJZWKSE32KZ9qgEhHg4Jfq6tZH4KF4ayChtXtmm");

#[program]
pub mod reward_vault {
    use super::*;

    /// Creator initializes a vault + SPL token mint for their game.
    pub fn init_vault(
        ctx: Context<InitVault>,
        game_id: u64,
        bronze_threshold: u64,
        silver_threshold: u64,
        gold_threshold: u64,
        bronze_amount: u64,
        silver_amount: u64,
        gold_amount: u64,
    ) -> Result<()> {
        require!(
            bronze_threshold < silver_threshold && silver_threshold < gold_threshold,
            VaultError::InvalidThresholds
        );

        let vault = &mut ctx.accounts.vault;
        vault.game_id = game_id;
        vault.creator = ctx.accounts.creator.key();
        vault.mint = ctx.accounts.mint.key();
        vault.bronze_threshold = bronze_threshold;
        vault.silver_threshold = silver_threshold;
        vault.gold_threshold = gold_threshold;
        vault.bronze_amount = bronze_amount;
        vault.silver_amount = silver_amount;
        vault.gold_amount = gold_amount;
        vault.total_distributed = 0;
        vault.mint_bump = ctx.bumps.mint;
        vault.vault_bump = ctx.bumps.vault;

        msg!("Vault initialized for game_id={}", game_id);
        Ok(())
    }

    /// Player claims token reward based on their score.
    /// Score must already be on the leaderboard (off-chain verification via score arg).
    pub fn claim_reward(
        ctx: Context<ClaimReward>,
        game_id: u64,
        score: u64,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;

        let reward_amount = if score >= vault.gold_threshold {
            vault.gold_amount
        } else if score >= vault.silver_threshold {
            vault.silver_amount
        } else if score >= vault.bronze_threshold {
            vault.bronze_amount
        } else {
            return err!(VaultError::ScoreBelowBronze);
        };

        // PDA signs for mint authority
        let seeds: &[&[u8]] = &[
            b"reward_mint",
            &game_id.to_le_bytes(),
            &[vault.mint_bump],
        ];
        let signer_seeds = [seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.player_token_account.to_account_info(),
                authority: ctx.accounts.mint.to_account_info(),
            },
            &signer_seeds,
        );
        token::mint_to(cpi_ctx, reward_amount)?;

        ctx.accounts.vault.total_distributed = ctx
            .accounts
            .vault
            .total_distributed
            .saturating_add(reward_amount);

        msg!(
            "Reward claimed: player={} score={} amount={}",
            ctx.accounts.player.key(),
            score,
            reward_amount
        );
        Ok(())
    }
}

// ─── Accounts ───────────────────────────────────────────────────────────────

#[account]
pub struct RewardVault {
    pub game_id: u64,
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub bronze_threshold: u64,
    pub silver_threshold: u64,
    pub gold_threshold: u64,
    pub bronze_amount: u64,
    pub silver_amount: u64,
    pub gold_amount: u64,
    pub total_distributed: u64,
    pub mint_bump: u8,
    pub vault_bump: u8,
}

impl RewardVault {
    // 8 disc + 8 + 32 + 32 + 8*7 + 1 + 1
    pub const LEN: usize = 8 + 8 + 32 + 32 + 56 + 2;
}

// ─── Contexts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct InitVault<'info> {
    #[account(
        init,
        payer = creator,
        space = RewardVault::LEN,
        seeds = [b"vault", game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Account<'info, RewardVault>,

    #[account(
        init,
        payer = creator,
        seeds = [b"reward_mint", game_id.to_le_bytes().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = mint,  // PDA is its own authority
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct ClaimReward<'info> {
    #[account(
        mut,
        seeds = [b"vault", game_id.to_le_bytes().as_ref()],
        bump = vault.vault_bump
    )]
    pub vault: Account<'info, RewardVault>,

    #[account(
        mut,
        seeds = [b"reward_mint", game_id.to_le_bytes().as_ref()],
        bump = vault.mint_bump
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = player,
        associated_token::mint = mint,
        associated_token::authority = player
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum VaultError {
    #[msg("Thresholds must be strictly increasing")]
    InvalidThresholds,
    #[msg("Score is below bronze threshold")]
    ScoreBelowBronze,
}
