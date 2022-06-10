use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Token, Mint, TokenAccount},
    associated_token::{self, AssociatedToken},
};

declare_id!("A6UZkY9Lbr5DchCcxKAL91f7LheDFjvwbECPpvtXgV15");

#[program]
pub mod prog {
    use anchor_spl::token::{transfer, Transfer};

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.funded_by = ctx.accounts.signer.key();
        vault.token_account_key = ctx.accounts.token_vault_account.key();
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(), 
                Transfer {
                    from: ctx.accounts.token_owner_account.to_account_info(),
                    to: ctx.accounts.token_vault_account.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(), 
                }),
                amount
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer, 
    )]
    pub token_owner_account: Account<'info, TokenAccount>, 

    #[account(
        init_if_needed,
        space = Vault::LEN,
        payer = signer,
        seeds = [
            b"vault",
            mint.key().as_ref(),
        ],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init_if_needed, 
        payer = signer, 
        token::mint = mint,
        token::authority = vault, 
    )]
    pub token_vault_account: Account<'info, TokenAccount>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>, 

    #[account(address = associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>, 

    pub rent: Sysvar<'info, Rent>, 

}

#[account]
pub struct Vault {
    pub funded_by: Pubkey,
    pub token_account_key: Pubkey,
}

impl Vault {
    pub const LEN: usize = 8+32+32;
}
