use anchor_lang::prelude::*;

use crate::GlobalState;

pub fn create_new_game(ctx: Context<CreateNewGameData>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let game_state = &mut ctx.accounts.game_state;

    // Should be admin and no other game active
    require_keys_eq!(global_state.admin, ctx.accounts.user.key(), CustomError::Unauthorized);
    require!(global_state.active_game_id.is_none(), CustomError::GameAlreadyActive);

    // Initialize game state
    game_state.game_id = global_state.next_game_id;
    
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
        space = 8 + 32 + 8,
        seeds = [b"game".as_ref(), &global_state.next_game_id.to_le_bytes()],
        bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct GameState {
    pub last_user: Pubkey,
    pub game_id: u64,
}

#[error_code]
pub enum CustomError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("A game is already active")]
    GameAlreadyActive,
}