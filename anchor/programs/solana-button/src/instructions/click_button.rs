use anchor_lang::prelude::*;
use anchor_lang::system_program::transfer;

use crate::GlobalState;
use crate::GameState;
use crate::Vault;
use crate::verify_game_state::internal_verify_game_state;

pub fn click_button(ctx: Context<ClickButtonData>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let global_state = &mut ctx.accounts.global_state;
    let game_state = &mut ctx.accounts.game_state;

    let clock = Clock::get()?;
    internal_verify_game_state(game_state, global_state, clock.unix_timestamp);

    // Shoud game not be ended
    require!(!game_state.has_ended, ClickButtonError::GameEnded);
    // Should transfer correct amount
    require!(amount == vault.deposit_amount, ClickButtonError::IncorrectDepositAmount);
    // Shoud game be active
    require!(game_state.is_active, ClickButtonError::GameNotActive);
    // Should user not be last clicker
    require!(ctx.accounts.user.key() != game_state.last_clicker, ClickButtonError::AlreadyLastClicker);
    // Should user have sufficient money
    require!(ctx.accounts.user.lamports() >= amount, ClickButtonError::InsufficientFunds);

    // Update vault
    vault.balance += amount;

    // Update game state
    let game_state = &mut ctx.accounts.game_state;
    game_state.last_clicker = *ctx.accounts.user.key;
    game_state.last_click_timestamp = Some(clock.unix_timestamp);
    game_state.click_number += 1;

    // Transfer SOL from USER account to VAULT
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.system_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    transfer(cpi_ctx, amount)?;

    Ok(())
}

#[derive(Accounts)]
pub struct ClickButtonData<'info> {
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>, 
}

#[error_code]
pub enum ClickButtonError {
    #[msg("Incorrect deposit amount")]
    IncorrectDepositAmount,

    #[msg("Insufficient funds in user account")]
    InsufficientFunds,

    #[msg("Game not active")]
    GameNotActive,

    #[msg("Already the last clicker")]
    AlreadyLastClicker,

    #[msg("Game has ended")]
    GameEnded,
}