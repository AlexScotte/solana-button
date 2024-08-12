use anchor_lang::prelude::*;

declare_id!("7zWaRVHxPeM3onPKRtJPzJfWTppwX4JimBj1oq2yDXzY");

#[program]
pub mod solana_button {
    use super::*;

    pub fn create_new_game(ctx: Context<NewGameData>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.last_user = *ctx.accounts.user.key;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct NewGameData<'info> {
    #[account(init, payer = user, space = 8 + 32 + 8)]
    pub state: Account<'info, GameState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GameState {
    pub last_user: Pubkey,
}