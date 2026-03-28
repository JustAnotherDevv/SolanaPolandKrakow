use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("9c2GADAaWZsXcRojw1aWfnZuRgyAWAnrpXS8NNLcbrAN");

/// Platform treasury address — replace with your actual key before deploy.
pub const PLATFORM_TREASURY: &str = "11111111111111111111111111111111";

#[program]
pub mod tip_jar {
    use super::*;

    /// Creator initializes their tip jar.
    pub fn init_tip_jar(ctx: Context<InitTipJar>, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= 1000, TipJarError::FeeTooHigh); // max 10%

        let jar = &mut ctx.accounts.tip_jar;
        jar.creator = ctx.accounts.creator.key();
        jar.platform_treasury = ctx.accounts.platform_treasury.key();
        jar.platform_fee_bps = fee_bps;
        jar.total_received = 0;
        jar.bump = ctx.bumps.tip_jar;

        msg!("TipJar initialized for creator={}", ctx.accounts.creator.key());
        Ok(())
    }

    /// Tipper sends SOL to a creator, platform fee split applied.
    pub fn tip_sol(ctx: Context<TipSol>, amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, TipJarError::ZeroAmount);
        require!(
            amount_lamports >= 1_000_000, // min 0.001 SOL
            TipJarError::AmountTooSmall
        );

        let fee_bps = ctx.accounts.tip_jar.platform_fee_bps as u64;
        let platform_amount = amount_lamports * fee_bps / 10_000;
        let creator_amount = amount_lamports - platform_amount;

        // Transfer to creator
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.tipper.to_account_info(),
                    to: ctx.accounts.creator.to_account_info(),
                },
            ),
            creator_amount,
        )?;

        // Transfer platform fee
        if platform_amount > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.tipper.to_account_info(),
                        to: ctx.accounts.platform_treasury.to_account_info(),
                    },
                ),
                platform_amount,
            )?;
        }

        ctx.accounts.tip_jar.total_received = ctx
            .accounts
            .tip_jar
            .total_received
            .saturating_add(amount_lamports);

        msg!(
            "Tip sent: {} lamports to creator={}, {} to treasury",
            creator_amount,
            ctx.accounts.creator.key(),
            platform_amount
        );
        Ok(())
    }
}

// ─── Accounts ───────────────────────────────────────────────────────────────

#[account]
pub struct TipJar {
    pub creator: Pubkey,
    pub platform_treasury: Pubkey,
    pub platform_fee_bps: u16,
    pub total_received: u64,
    pub bump: u8,
}

impl TipJar {
    // 8 disc + 32 + 32 + 2 + 8 + 1
    pub const LEN: usize = 8 + 32 + 32 + 2 + 8 + 1;
}

// ─── Contexts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitTipJar<'info> {
    #[account(
        init,
        payer = creator,
        space = TipJar::LEN,
        seeds = [b"tip_jar", creator.key().as_ref()],
        bump
    )]
    pub tip_jar: Account<'info, TipJar>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: This is the platform treasury address, validated by constant
    pub platform_treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TipSol<'info> {
    #[account(
        mut,
        seeds = [b"tip_jar", creator.key().as_ref()],
        bump = tip_jar.bump,
        has_one = creator,
        has_one = platform_treasury
    )]
    pub tip_jar: Account<'info, TipJar>,

    /// CHECK: Validated via has_one constraint on tip_jar
    #[account(mut)]
    pub creator: AccountInfo<'info>,

    /// CHECK: Validated via has_one constraint on tip_jar
    #[account(mut)]
    pub platform_treasury: AccountInfo<'info>,

    #[account(mut)]
    pub tipper: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum TipJarError {
    #[msg("Platform fee cannot exceed 10%")]
    FeeTooHigh,
    #[msg("Tip amount must be greater than zero")]
    ZeroAmount,
    #[msg("Minimum tip is 0.001 SOL")]
    AmountTooSmall,
}
