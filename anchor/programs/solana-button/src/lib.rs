use anchor_lang::prelude::*;

declare_id!("7zWaRVHxPeM3onPKRtJPzJfWTppwX4JimBj1oq2yDXzY");

#[program]
pub mod solana_button {
    use super::*;

    pub fn greet(_ctx: Context<Initialize>) -> Result<()> {
        msg!("GM!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
