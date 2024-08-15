use anchor_lang::prelude::*;

pub mod instructions;
use instructions::*;

declare_id!("4p5V8JvhjBoshkqGGT4Lr1DAMuPX2fLuo3GbuGCuv3R1");

#[program]
pub mod solana_button {
    use super::*;

   
    pub fn initialize_global_state(ctx: Context<InitializeGlobalStateData>) -> Result<()> {
        initialize_global_state::initialize_global_state(ctx)
    }

    pub fn create_new_game(ctx: Context<CreateNewGameData>, deposit_amount: u64, game_time_sec: i64) -> Result<()> {
        create_new_game::create_new_game(ctx, deposit_amount, game_time_sec)
    }

    pub fn click_button(ctx: Context<ClickButtonData>, amount: u64) -> Result<()> {
        click_button::click_button(ctx, amount)
    }

    pub fn claim_reward(ctx: Context<ClaimRewardData>) -> Result<()> {
        claim_reward::claim_reward(ctx)
    }

    pub fn verify_game_state(ctx: Context<VerifyGameStateData>) -> Result<()> {
        verify_game_state::verify_game_state(ctx)
    }
}
