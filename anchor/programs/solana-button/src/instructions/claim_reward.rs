use anchor_lang::prelude::*;

use crate::GlobalState;
use crate::GameState;
use crate::Vault;


pub fn claim_reward(ctx: Context<ClaimRewardData>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let game_state = &mut ctx.accounts.game_state;
    let global_state = &mut ctx.accounts.global_state;

    // Should game be active
    require!(game_state.has_ended, ClaimRewardError::GameNotEnded);

    // Should user be last clicker
    require!(ctx.accounts.user.key() == game_state.last_clicker, ClaimRewardError::NotLastClicker);
    
    // Shoul vault balance > 0
    require!(vault.balance > 0, ClaimRewardError::NoRewardsInVault);

    // Calculate reward amount
    let reward_amount = vault.balance;

    // Transfer SOL from VAULT to USER
    **vault.to_account_info().try_borrow_mut_lamports()? -= reward_amount;
    **ctx.accounts.user.try_borrow_mut_lamports()? += reward_amount;

    // Update vault
    vault.balance = 0;

    // Update game state
    game_state.is_active = false;

    // Update global state
    global_state.active_game_id = None;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimRewardData<'info> {
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ClaimRewardError {
    #[msg("Game has not ended")]
    GameNotEnded,

    #[msg("User is not the last clicker")]
    NotLastClicker,

    #[msg("No rewards in vault")]
    NoRewardsInVault,
}