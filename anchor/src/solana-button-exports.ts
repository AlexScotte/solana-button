// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Cluster, PublicKey } from '@solana/web3.js';
import SolanaButtonIDL from '../target/idl/solana_button.json';
import type { SolanaButton } from '../target/types/solana_button';

// Re-export the generated IDL and type
export { SolanaButton, SolanaButtonIDL };

// The programId is imported from the program IDL.
export const SOLANA_BUTTON_PROGRAM_ID = new PublicKey(SolanaButtonIDL.address);

// This is a helper function to get the SolanaButton Anchor program.
export function getSolanaButtonProgram(provider: AnchorProvider) {
  return new Program(SolanaButtonIDL as SolanaButton, provider);
}

// This is a helper function to get the program ID for the SolanaButton program depending on the cluster.
export function getSolanaButtonProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
    case 'mainnet-beta':
    default:
      return SOLANA_BUTTON_PROGRAM_ID;
  }
}
