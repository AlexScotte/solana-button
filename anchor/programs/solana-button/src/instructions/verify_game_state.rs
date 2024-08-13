use anchor_lang::prelude::*;

use crate::GlobalState;
use crate::GameState;

pub fn verify_game_state(ctx: Context<VerifyGameStateData>) -> Result<()> {
    
    let game_state = &mut ctx.accounts.game_state;
    let global_state = &mut ctx.accounts.global_state;

    let clock = Clock::get()?;
    internal_verify_game_state(game_state, global_state, clock.unix_timestamp);

    Ok(())
}

// pub(crate) to let the function accessible by the program but not the front
pub(crate) fn internal_verify_game_state(game_state: &mut GameState, global_state: &mut GlobalState, current_timestamp: i64)  {

    if game_state.is_active && !game_state.has_ended {
        if let Some(last_click_time) = game_state.last_click_timestamp {
            if current_timestamp - last_click_time >= game_state.game_time_sec {

                // Update game state
                game_state.is_active = false;
                game_state.has_ended = true;
                
                // Update global state
                global_state.active_game_id = None;
                
                // GAME ENDS HERE
            }
        }
    }
}


#[derive(Accounts)]
pub struct VerifyGameStateData<'info> {
    #[account(mut)]
    pub game_state: Account<'info, GameState>,
    
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
}