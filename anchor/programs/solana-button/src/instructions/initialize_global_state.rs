use anchor_lang::prelude::*;

pub fn initialize_global_state(ctx: Context<InitializeGlobalStateData>) -> Result<()>{

    let global_state = &mut ctx.accounts.global_state;
    global_state.authority = *ctx.accounts.authority.key;
    global_state.next_game_id = 0;
    global_state.active_game_id = None;

    Ok(())
}


#[derive(Accounts)]
pub struct InitializeGlobalStateData<'info> {

    #[account(init, payer = authority, space = 8 + 32 + 8 + (1 + 8), seeds = [b"global".as_ref()], bump)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub next_game_id: u64,
    pub active_game_id: Option<u64>,
}