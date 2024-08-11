import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { SolanaButton } from '../target/types/solana_button';

describe('solana-button', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaButton as Program<SolanaButton>;

  it('should run the program', async () => {
    // Add your test here.
    const tx = await program.methods.greet().rpc();
    console.log('Your transaction signature', tx);
  });
});
