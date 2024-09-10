import * as anchor from '@coral-xyz/anchor';
import "dotenv/config";

import { initializeAnchor } from './anchor_config';
import { sendAndConfirmTransaction } from '@solana/web3.js';
import { getGlobalStatePda } from './program_pda';


async function main() {

    const { provider, program, wallet } = await initializeAnchor();

    console.log("⌛ Trying to initialize the global state");
    
    const { globalStatePda } = await getGlobalStatePda(program);

    //     TODO: check why error "Type instantiation is excessively deep and possibly infinite.ts(2589)"
    // const tx = await program.methods
    //     .initializeGlobalState()
    //     .accounts({
    //         globalState: globalStatePda,
    //         authority: wallet.publicKey,
    //         systemProgram: anchor.web3.SystemProgram.programId,
    //     })
    //     .rpc();

    const initializeGlobalStateInstruction = await program.instruction.initializeGlobalState(
        {
            accounts: {
                globalState: globalStatePda,
                authority: wallet.publicKey,
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

    console.log("📝 Transaction signature: ", signedTx);

    await provider.connection.confirmTransaction(signedTx);

    console.log("✅ Global state initialized");

    const globalStateAcc = await program.account.globalState.fetch(globalStatePda);
    console.log("📋 Global state account: ", globalStateAcc);
}

main().catch((error) => {
    console.error("❌ An error occurred: ", error);
});
