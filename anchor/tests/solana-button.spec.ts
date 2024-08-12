import * as anchor from '@coral-xyz/anchor';
import { SolanaButton } from '../target/types/solana_button';
const { SystemProgram, PublicKey } = anchor.web3;


describe('solana-button', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaButton as anchor.Program<SolanaButton>;
  console.log("Program ID: ", program.programId.toBase58());

  it('Should create a new game state!', async () => {

    const stateAccount = anchor.web3.Keypair.generate();

    // Execute the initialize instruction.
    await program.methods
      .createNewGame().accounts(
        {
          state: stateAccount.publicKey,
          user: provider.wallet.publicKey,

          systemProgram: SystemProgram.programId,
        },
      )
      .signers([stateAccount])
      .rpc();

    // Fetch the state account details.
    const account = await program.account.gameState.fetch(stateAccount.publicKey);

    // Assert that the last_user field is equal to the provider's public key.
    expect(account.lastUser.toBase58()).toBe(provider.wallet.publicKey.toBase58());
  });

});
