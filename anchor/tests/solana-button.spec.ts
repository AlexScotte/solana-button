import * as anchor from '@coral-xyz/anchor';
import { SolanaButton } from '../target/types/solana_button';
const { SystemProgram } = anchor.web3;


describe('solana-button', () => {

  const DEPOSIT_AMOUNT = 1 * anchor.web3.LAMPORTS_PER_SOL;
  const SEED_GLOBAL = "global";
  const SEED_GAME = "game";
  const SEED_VAULT = "vault";

  let globalStatePda: anchor.web3.PublicKey;
  let currentGameStatePda: anchor.web3.PublicKey;
  let currentVaultPda: anchor.web3.PublicKey;
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
  const USER_2 = anchor.web3.Keypair.generate();


  const program = anchor.workspace.SolanaButton as anchor.Program<SolanaButton>;
  console.log("Program ID: ", program.programId.toBase58());

  const requestAirdrop = async (publicKey: anchor.web3.PublicKey) => {
    const airdropSignature = await program.provider.connection.requestAirdrop(
      publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );

    await program.provider.connection.confirmTransaction(airdropSignature);
  };

  beforeAll(async () => {

    if (!isDevnet) {

      await requestAirdrop(ADMIN_PUBKEY);
      await requestAirdrop(USER_1.publicKey);
      await requestAirdrop(USER_2.publicKey);
    }

    [globalStatePda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(SEED_GLOBAL)],
      program.programId
    );

    // Initialize the global state
    await program.methods
      .initializeGlobalState()
      .accounts({
        globalState: globalStatePda,
        authority: ADMIN_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  describe('Should global state be initialized correctly', () => {

    it('Should global state admin be set to admin public key', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.authority.toBase58()).toBe(ADMIN_PUBKEY.toBase58());
    });

    it('Should global state next game id be set to 0', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.nextGameId.toNumber()).toBe(0);
    });

    it('Should global state active game id be set to none', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.activeGameId).toBeNull();
    });
  });

  describe('Should Admin can create a new game', () => {

    beforeAll(async () => {

      // Get global state
      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      [currentGameStatePda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(SEED_GAME), globalStateAccount.nextGameId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      [currentVaultPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("vault"), globalStateAccount.nextGameId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      // Execute the create_new_game instruction as admin.
      await program.methods
        .createNewGame(new anchor.BN(DEPOSIT_AMOUNT))
        .accounts({
          globalState: globalStatePda,
          gameState: currentGameStatePda,
          vault: currentVaultPda,
          user: ADMIN_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    });

    it('Should the new created game be the global active game', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(globalStateAccount.activeGameId.toNumber()).toBe(gameStateAccount.gameId.toNumber());
    });

    it('Should game state new game id be 0', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.gameId.toNumber()).toBe(0);
    });

    it('Should game state new game be active', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.isActive).toBe(true);
    });

    it('Should game state last user not be initialized', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.lastClicker.toBase58()).toBe(SystemProgram.programId.toBase58());
    });

    it('Should global state next game id be set to 1', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.nextGameId.toNumber()).toBe(1);
    });

    it('Should global state active game id be set to 0', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.activeGameId.toNumber()).toBe(0);
    });

    it('Should not create a new game if creator is not admin', async () => {

      const [newGameStateAccount] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(SEED_GAME), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const [newCurrentVaultPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(SEED_VAULT), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      // Attempt to create a new game with a non-admin user
      await expect(
        program.methods
          .createNewGame(new anchor.BN(DEPOSIT_AMOUNT))
          .accounts({
            globalState: globalStatePda,
            gameState: newGameStateAccount,
            vault: newCurrentVaultPda,
            user: USER_1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_1])
          .rpc()
      ).rejects.toThrow(/Unauthorized/);
    });

    it('Should not create a new game if one is already active', async () => {

      const [newGameStateAccount] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(SEED_GAME), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const [newVaultPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(SEED_VAULT), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      // Attempt to create a new game
      await expect(
        program.methods
          .createNewGame(new anchor.BN(DEPOSIT_AMOUNT))
          .accounts({
            globalState: globalStatePda,
            gameState: newGameStateAccount,
            vault: newVaultPda,
            user: ADMIN_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc()
      ).rejects.toThrow(/GameAlreadyActive/);
    });

    it('Should vault authority be set to admin public key', async () => {

      const vaultStateAccount = await program.account.vault.fetch(currentVaultPda);

      expect(vaultStateAccount.authority.toBase58()).toBe(ADMIN_PUBKEY.toBase58());
    });

    it('Should vault intiale balance be set to 0', async () => {

      const vaultStateAccount = await program.account.vault.fetch(currentVaultPda);

      expect(vaultStateAccount.balance.toNumber()).toBe(0);
    });

    it('Should vault deposit amount be set to the configured value', async () => {

      const vaultStateAccount = await program.account.vault.fetch(currentVaultPda);

      expect(vaultStateAccount.depositAmount.toNumber()).toBe(DEPOSIT_AMOUNT);
    });
  });


  describe('Should User cannot click on button', () => {

    it('Should User cannot click button if deposit amount is incorrect', async () => {

      await expect(
        program.methods
          .clickButton(new anchor.BN(99))
          .accounts({
            vault: currentVaultPda,
            gameState: currentGameStatePda,
            user: USER_1.publicKey,

            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_1])
          .rpc()
      ).rejects.toThrow(/IncorrectDepositAmount/);
    });

    it('Should User cannot click button if game is not active', async () => {

      const [newGameStateAccount] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(SEED_GAME), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const [newVaultPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(SEED_VAULT), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      await expect(
        program.methods
          .clickButton(new anchor.BN(DEPOSIT_AMOUNT))
          .accounts({
            vault: newVaultPda,
            gameState: newGameStateAccount,
            user: USER_1.publicKey,

            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_1])
          .rpc()
      ).rejects.toThrow(/AccountNotInitialized./);
    });
  });

  describe('Should User 1 can click on button', () => {

    let vaultAccountBeforeClick;
    let userInitialeBalance;
    beforeAll(async () => {

      userInitialeBalance = await provider.connection.getBalance(USER_1.publicKey);

      vaultAccountBeforeClick = await program.account.vault.fetch(currentVaultPda);

      await program.methods
        .clickButton(new anchor.BN(DEPOSIT_AMOUNT))
        .accounts({
          vault: currentVaultPda,
          gameState: currentGameStatePda,
          user: USER_1.publicKey,

          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([USER_1])
        .rpc()
    });

    it('Should vault balance be increased by deposit amount', async () => {

      const vaultAccount = await program.account.vault.fetch(currentVaultPda);

      expect(vaultAccount.balance.toNumber()).toBe(vaultAccountBeforeClick.balance.toNumber() + DEPOSIT_AMOUNT);
    });

    it('Should game state last clicker be the user 1', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.lastClicker.toBase58()).toBe(USER_1.publicKey.toBase58());
    });

    it('Should user 1 balance be decreased by deposit amount', async () => {

      const userBalance = await provider.connection.getBalance(USER_1.publicKey);

      expect(userBalance).toBe(userInitialeBalance - DEPOSIT_AMOUNT);
    });

    it('Should user 1 cannot click again if he is the last clicker', async () => {

      await expect(
        program.methods
          .clickButton(new anchor.BN(DEPOSIT_AMOUNT))
          .accounts({
            vault: currentVaultPda,
            gameState: currentGameStatePda,
            user: USER_1.publicKey,

            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_1])
          .rpc()
      ).rejects.toThrow(/AlreadyLastClicker/);
    });
  });

  describe('Should another User 2 can click on button', () => {

    let vaultAccountBeforeClick;
    let userInitialeBalance;
    beforeAll(async () => {

      userInitialeBalance = await provider.connection.getBalance(USER_2.publicKey);

      vaultAccountBeforeClick = await program.account.vault.fetch(currentVaultPda);

      await program.methods
        .clickButton(new anchor.BN(DEPOSIT_AMOUNT))
        .accounts({
          vault: currentVaultPda,
          gameState: currentGameStatePda,
          user: USER_2.publicKey,

          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([USER_2])
        .rpc()
    });

    it('Should vault balance be increased by deposit amount', async () => {

      const vaultAccount = await program.account.vault.fetch(currentVaultPda);

      expect(vaultAccount.balance.toNumber()).toBe(vaultAccountBeforeClick.balance.toNumber() + DEPOSIT_AMOUNT);
    });

    it('Should game state last clicker be the user 2', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.lastClicker.toBase58()).toBe(USER_2.publicKey.toBase58());
    });

    it('Should user 2 balance be decreased by deposit amount', async () => {

      const userBalance = await provider.connection.getBalance(USER_2.publicKey);

      expect(userBalance).toBe(userInitialeBalance - DEPOSIT_AMOUNT);
    });

    it('Should user 2 cannot click again if he is the last clicker', async () => {

      await expect(
        program.methods
          .clickButton(new anchor.BN(DEPOSIT_AMOUNT))
          .accounts({
            vault: currentVaultPda,
            gameState: currentGameStatePda,
            user: USER_2.publicKey,

            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_2])
          .rpc()
      ).rejects.toThrow(/AlreadyLastClicker/);
    });
  });
});
