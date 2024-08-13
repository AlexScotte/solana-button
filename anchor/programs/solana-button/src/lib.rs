use anchor_lang::prelude::*;

pub mod instructions;
use instructions::*;

declare_id!("7zWaRVHxPeM3onPKRtJPzJfWTppwX4JimBj1oq2yDXzY");

#[program]
pub mod solana_button {
    use super::*;

   
    pub fn initialize_global_state(ctx: Context<InitializeGlobalStateData>) -> Result<()> {
        initialize_global_state::initialize_global_state(ctx)
    }

    pub fn create_new_game(ctx: Context<CreateNewGameData>, deposit_amount: u64) -> Result<()> {
        create_new_game::create_new_game(ctx, deposit_amount)
    }

    pub fn click_button(ctx: Context<ClickButtonData>, amount: u64) -> Result<()> {
        click_button::click_button(ctx, amount)
    }
}
