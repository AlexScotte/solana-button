import * as anchor from '@coral-xyz/anchor';
import { SolanaButton } from '../target/types/solana_button';

const SEED_GLOBAL_STATE = "global";
const SEED_GAME = "game";
const SEED_VAULT = "vault";

export async function getGlobalStatePda(program: anchor.Program<SolanaButton>): Promise<{ globalStatePda: anchor.web3.PublicKey }> {

    const [globalStatePda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(SEED_GLOBAL_STATE)],
        program.programId
    );

    console.log("Global state PDA", globalStatePda.toBase58());

    return { globalStatePda };
}


export async function getGameStatePda(program: anchor.Program<SolanaButton>, gameId: number): Promise<{ gameStatePda: anchor.web3.PublicKey }> {

    const [gameStatePda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(SEED_GAME), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
        program.programId
    );
    console.log("Game state PDA", gameStatePda.toBase58());

    return { gameStatePda };
}

export async function getGameVaultPda(program: anchor.Program<SolanaButton>, gameId: number): Promise<{ vaultPda: anchor.web3.PublicKey }> {

    const [vaultPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(SEED_VAULT), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
        program.programId
    );
    console.log("Vault PDA", vaultPda.toBase58());
    return { vaultPda };
}