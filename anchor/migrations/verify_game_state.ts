import * as anchor from '@coral-xyz/anchor';
import "dotenv/config";

import { initializeAnchor } from './anchor_config';
import { sendAndConfirmTransaction } from '@solana/web3.js';

import { getGameStatePda, getGlobalStatePda, getVaultPda } from './program_pda';


async function main() {

    const { provider, program, wallet } = await initializeAnchor();

    console.log("⌛ Trying verify the game state: ");

    const { globalStatePda } = await getGlobalStatePda(program);
    const globalStateAccount = await program.account.globalState.fetch(globalStatePda);
    
    const { gameStatePda } = await getGameStatePda(program, globalStateAccount.activeGameId);

    const { vaultPda } = await getVaultPda(program, globalStateAccount.activeGameId);

    //     TODO: check why error "Type instantiation is excessively deep and possibly infinite.ts(2589)"
    // const tx = await program.methods
    //     .verifyGameState()
    //     .accounts({
    //     globalState: globalStatePda,
    //     gameState: gameStatePda,
    //     })
    //     .rpc();

    // const currentGameStateAccount = await program.account.gameState.fetch(currentGameStatePda);
    // console.log("Current game state account", currentGameStateAccount);

    const verifyGameStateInstruction = await program.instruction.verifyGameState(
        {
            accounts: {
                globalState: globalStatePda,
                gameState: gameStatePda,
            },
        }
    );

    const latestBlockhashInfo = await provider.connection.getLatestBlockhash("confirmed");

    const txVerifyGameState = new anchor.web3.Transaction({
        blockhash: latestBlockhashInfo.blockhash,
        feePayer: wallet.publicKey,
        lastValidBlockHeight: latestBlockhashInfo.lastValidBlockHeight,
    }).add(verifyGameStateInstruction);


    const signedTx = await sendAndConfirmTransaction(provider.connection, txVerifyGameState, [
        wallet.payer,
    ]);

    console.log("📝 Transaction signature", signedTx);

    await provider.connection.confirmTransaction(signedTx);

    console.log("✅ Game verified successfully");

    const globalStateAcc = await program.account.globalState.fetch(globalStatePda);
    console.log("📋 Global state account", globalStateAcc);

    const gameStateAccount = await program.account.gameState.fetch(gameStatePda);
    console.log("🎮 Game state account", gameStateAccount);

    const vaultStateAccount = await program.account.vault.fetch(vaultPda);
    console.log("🪙 Vault state account", vaultStateAccount);
}

main().catch((error) => {
    console.error("❌ An error occurred:", error);
});
