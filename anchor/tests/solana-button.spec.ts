import * as anchor from '@coral-xyz/anchor';
import { SolanaButton } from '../target/types/solana_button';
const { SystemProgram, PublicKey } = anchor.web3;


describe('solana-button', () => {
  let globalStatePda: anchor.web3.PublicKey;
  let currentGameStatePda: anchor.web3.PublicKey;
  let isDevnet: boolean = true;

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  if (
    provider.connection.rpcEndpoint === "http://127.0.0.1:8899" ||
    provider.connection.rpcEndpoint === "localnet"
  ) {
    isDevnet = false;
  }

  const ADMIN_PUBKEY: anchor.web3.PublicKey = provider.wallet.publicKey;
  const USER_1 = anchor.web3.Keypair.generate();


  const program = anchor.workspace.SolanaButton as anchor.Program<SolanaButton>;
  console.log("Program ID: ", program.programId.toBase58());

  const requestAirdrop = async (publicKey: anchor.web3.PublicKey) => {
    const airdropSignature = await program.provider.connection.requestAirdrop(
      publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );

    await program.provider.connection.confirmTransaction(airdropSignature);
  };

  beforeAll(async () => {

    if (!isDevnet) {

      await requestAirdrop(ADMIN_PUBKEY);
      await requestAirdrop(USER_1.publicKey);
    }

    [globalStatePda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("global")],
      program.programId
    );

    // Initialize the global state
    await program.methods
      .initializeGlobalState()
      .accounts({
        globalState: globalStatePda,
        admin: ADMIN_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it('Should global state be initialized correctly', async () => {

    // Fetch the global state account
    const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

    // Assert that the admin is set correctly and next_game_id is 0
    expect(globalStateAccount.admin.toBase58()).toBe(ADMIN_PUBKEY.toBase58());
    expect(globalStateAccount.nextGameId.toNumber()).toBe(0);
  });

  describe('Should Admin can create a new game', () => {

    beforeAll(async () => {

      // Get global state
      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      [currentGameStatePda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("game"), globalStateAccount.nextGameId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      // Execute the create_new_game instruction as admin.
      await program.methods
        .createNewGame()
        .accounts({
          globalState: globalStatePda,
          gameState: currentGameStatePda,
          user: ADMIN_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    });

    it('Should the new created game be the global active game', async () => {

      // Get global state
      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      // Fetch the game state account
      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      // Assert that the game is active
      expect(globalStateAccount.activeGameId.toNumber()).toBe(gameStateAccount.gameId.toNumber());
    });

    it('Should new game id be 0', async () => {

      // Fetch the game state account
      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      // Assert that the game id is 0
      expect(gameStateAccount.gameId.toNumber()).toBe(0);
    });

    it('Should last user not be initialized', async () => {

      // Fetch the game state account
      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      // Assert that the game id is 0
      expect(gameStateAccount.lastUser.toBase58()).toBe(SystemProgram.programId.toBase58());
    });

    it('Should next game id in global state be 1', async () => {

      // Get global state
      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      // Assert that the game id is 0
      expect(globalStateAccount.nextGameId.toNumber()).toBe(1);
    });

    it('Should not create a new game if one is already active', async () => {

      const [newGameStateAccount] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("game"), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
        program.programId
      );


      // Attempt to create a new game with a non-admin user
      await expect(
        program.methods
          .createNewGame()
          .accounts({
            globalState: globalStatePda,
            gameState: newGameStateAccount,
            user: USER_1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_1])
          .rpc()
      ).rejects.toThrow(/Unauthorized/);
    });
  });
});
