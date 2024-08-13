use anchor_lang::prelude::*;

use crate::GlobalState;

pub fn create_new_game(ctx: Context<CreateNewGameData>, deposit_amount: u64) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let game_state = &mut ctx.accounts.game_state;
    let vault = &mut ctx.accounts.vault;

    // Should be admin and no other game active
    require_keys_eq!(global_state.authority, ctx.accounts.user.key(), CreateGameError::Unauthorized);
    require!(global_state.active_game_id.is_none(), CreateGameError::GameAlreadyActive);

    // Initialize game state
    game_state.game_id = global_state.next_game_id;
    game_state.is_active = true;

    // Initialize vault to store the reward
    vault.authority = *ctx.accounts.user.key;
    vault.balance = 0;
    vault.deposit_amount = deposit_amount;

    // Update global state
    global_state.active_game_id = Some(game_state.game_id);
    global_state.next_game_id += 1;

    Ok(())
}


#[derive(Accounts)]
pub struct CreateNewGameData<'info> {

    #[account(mut, seeds = [b"global".as_ref()], bump)]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 1,
        seeds = [b"game".as_ref(), &global_state.next_game_id.to_le_bytes()],
        bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8,
        seeds = [b"vault".as_ref(), &global_state.next_game_id.to_le_bytes()], 
        bump
    )]
    pub vault: Account<'info, Vault>,


    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct GameState {
    pub last_clicker: Pubkey,
    pub game_id: u64,
    pub click_number: u64,
    pub is_active: bool
}

#[account]
pub struct Vault {
    pub authority: Pubkey, 
    pub balance: u64,
    pub deposit_amount: u64,
}

#[error_code]
pub enum CreateGameError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("A game is already active")]
    GameAlreadyActive,
}