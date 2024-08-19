import * as anchor from '@coral-xyz/anchor';
import "dotenv/config";

import { initializeAnchor } from './anchor_config';
import { sendAndConfirmTransaction } from '@solana/web3.js';

import { getGameStatePda, getGlobalStatePda, getVaultPda } from './program_pda';


async function main() {

    const DEPOSIT_AMOUNT_SOL = 0.01;
    const DURATION_HOURS = 24;

    // 0.01 SOL
    const DEPOSIT_AMOUNT = DEPOSIT_AMOUNT_SOL * anchor.web3.LAMPORTS_PER_SOL;
    // 24 hours
    const DEPOSIT_DURATION = DURATION_HOURS * 60 * 60;

    const { provider, program, wallet } = await initializeAnchor();

    console.log("⌛ Trying to create a new game with deposit amount: ", DEPOSIT_AMOUNT_SOL, " and duration: ", DURATION_HOURS);

    const { globalStatePda } = await getGlobalStatePda(program);
    const globalStateAccount = await program.account.globalState.fetch(globalStatePda);
    console.log("📋 Global state account", globalStateAccount);
    
    const { gameStatePda } = await getGameStatePda(program, globalStateAccount.nextGameId);

    const { vaultPda } = await getVaultPda(program, globalStateAccount.nextGameId);

    //     TODO: check why error "Type instantiation is excessively deep and possibly infinite.ts(2589)"
    //     const tx = await program.methods
    //         .createNewGame(
    //             new anchor.BN(DEPOSIT_AMOUNT),
    //             new anchor.BN(DEPOSIT_DURATION)
    //         )
    //         .accounts({
    //             globalState: globalStatePda,
    //             gameState: currentGameStatePda,
    //             vault: currentVaultPda,
    //             user: ADMIN_PUBKEY,
    //             systemProgram: anchor.web3.SystemProgram.programId,
    //         })
    //         .rpc();

    // const currentGameStateAccount = await program.account.gameState.fetch(currentGameStatePda);
    // console.log("Current game state account", currentGameStateAccount);

    const createGameStateInstruction = await program.instruction.createNewGame(
        new anchor.BN(DEPOSIT_AMOUNT),
        new anchor.BN(DEPOSIT_DURATION),
        {
            accounts: {
                globalState: globalStatePda,
                gameState: gameStatePda,
                vault: vaultPda,
                user: wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        }
    );

    const latestBlockhashInfo = await provider.connection.getLatestBlockhash("confirmed");

    const txCreateGameState = new anchor.web3.Transaction({
        blockhash: latestBlockhashInfo.blockhash,
        feePayer: wallet.publicKey,
        lastValidBlockHeight: latestBlockhashInfo.lastValidBlockHeight,
    }).add(createGameStateInstruction);


    const signedTx = await sendAndConfirmTransaction(provider.connection, txCreateGameState, [
        wallet.payer,
    ]);

    console.log("📝 Transaction signature", signedTx);

    await provider.connection.confirmTransaction(signedTx);

    console.log("✅ Game created successfully");

    const globalStateAcc = await program.account.globalState.fetch(globalStatePda);
    console.log("📋 Global state account", globalStateAcc);

    const gameStateAccount = await program.account.gameState.fetch(gameStatePda);
    console.log("🎮 Game state account", gameStateAccount);

    const vaultStateAccount = await program.account.vault.fetch(vaultPda);
    console.log("🪙  Vault state account", vaultStateAccount);
}

main().catch((error) => {
    console.error("❌ An error occurred:", error);
});
