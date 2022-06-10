import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import {
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  createAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  getAccount,
} from "@solana/spl-token";
import { Prog } from "../target/types/prog";

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

async function findAssociatedTokenAddress(
  walletAddress: PublicKey,
  tokenMintAddress: PublicKey
): Promise<PublicKey> {
  return (
    await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    )
  )[0];
}

describe("prog", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Prog as Program<Prog>;

  let wallet1 = Keypair.generate();
  let vaultToken = Keypair.generate();

  it("Is initialized!", async () => {
    // Add your test here.
    let tx = await provider.connection.requestAirdrop(wallet1.publicKey, 1e9);
    await provider.connection.confirmTransaction(tx, "singleGossip");
    console.log("Airdrop complete");

    const tokenMintKey = await createMint(
      provider.connection,
      wallet1,
      wallet1.publicKey,
      wallet1.publicKey,
      9,
      undefined,
      { commitment: "singleGossip" },
      TOKEN_PROGRAM_ID
    );
    console.log("Mint creation omplete");

    const ownerTokenAccountKey = await createAssociatedTokenAccount(
      provider.connection,
      wallet1,
      tokenMintKey,
      wallet1.publicKey,
      { commitment: "singleGossip" },
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Associated account creation  complete");

    await mintTo(
      provider.connection,
      wallet1,
      tokenMintKey,
      ownerTokenAccountKey,
      wallet1,
      1000,
      [],
      { commitment: "singleGossip" },
      TOKEN_PROGRAM_ID
    );
    console.log("Minted to account");

    let [vaultPDA, bump] = findProgramAddressSync(
      [Buffer.from("vault"), tokenMintKey.toBuffer()],
      program.programId
    );

    tx = await program.rpc.initialize(new anchor.BN(1000), {
      accounts: {
        signer: wallet1.publicKey,
        mint: tokenMintKey,
        tokenOwnerAccount: ownerTokenAccountKey,
        vault: vaultPDA,
        tokenVaultAccount: vaultToken.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
      signers: [wallet1, vaultToken],
    });
    console.log("Your transaction signature", tx);
    await provider.connection.confirmTransaction(tx, "singleGossip");

    let vaultAccount = await program.account.vault.fetch(vaultPDA);
    console.log("Vault funded by: ", vaultAccount.fundedBy.toString());

    let ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet1,
      tokenMintKey,
      wallet1.publicKey,
      false,
      undefined,
      { commitment: "singleGossip" },
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Remaining token balance: ", ownerTokenAccount.amount);

    let vaultTokenAccount = await getAccount(
      provider.connection,
      vaultAccount.tokenAccountKey,
      "singleGossip",
      TOKEN_PROGRAM_ID
    );
    console.log("Vault token balance: ", vaultTokenAccount.amount);
  });
});
