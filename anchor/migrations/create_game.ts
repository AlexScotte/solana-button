import * as anchor from '@coral-xyz/anchor';
import "dotenv/config";

import { initializeAnchor } from './anchor_config';
import { sendAndConfirmTransaction } from '@solana/web3.js';

import { getGlobalStatePda } from './program_pda';


async function main() {

    // 0.01 SOL
    const DEPOSIT_AMOUNT = 0.01 * anchor.web3.LAMPORTS_PER_SOL;
    // 24 hours
    const DEPOSIT_DURATION = 24 * 60 * 60;

    const { provider, program, wallet } = await initializeAnchor();

    const { globalStatePda } = await getGlobalStatePda(program);

    //     TODO: check why error "Type instantiation is excessively deep and possibly infinite.ts(2589)"
    //     const tx = await program.methods
    //         .createNewGame(
    //             new anchor.BN(0.01 * anchor.web3.LAMPORTS_PER_SOL),
    //             new anchor.BN(24 * 60 * 60)
    //         )
    //         .accounts({
    //             globalState: globalStatePda,
    //             gameState: currentGameStatePda,
    //             vault: currentVaultPda,
    //             user: ADMIN_PUBKEY,
    //             systemProgram: anchor.web3.SystemProgram.programId,
    //         })
    //         .rpc();

    const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

    console.log("Global state account", globalStateAccount);



    // const currentGameStateAccount = await program.account.gameState.fetch(currentGameStatePda);
    // console.log("Current game state account", currentGameStateAccount);

    const initializeGlobalStateInstruction = await program.instruction.createNewGame(
        new anchor.BN(DEPOSIT_AMOUNT),
        new anchor.BN(DEPOSIT_DURATION),
        {
            accounts: {
                globalState: globalStatePda,
                gameState: currentGameStatePda,
                vault: currentVaultPda,
                user: ADMIN_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        }
    );

    const latestBlockhashInfo = await provider.connection.getLatestBlockhash("confirmed");

    const txInitializeGlobalState = new anchor.web3.Transaction({
        blockhash: latestBlockhashInfo.blockhash,
        feePayer: wallet.publicKey,
        lastValidBlockHeight: latestBlockhashInfo.lastValidBlockHeight,
    }).add(initializeGlobalStateInstruction);


    const signedTx = await sendAndConfirmTransaction(provider.connection, txInitializeGlobalState, [
        wallet.payer,
    ]);

    console.log("Transaction signature", signedTx);

    await provider.connection.confirmTransaction(signedTx);
}

main().catch((error) => {
    console.error("An error occurred:", error);
});
