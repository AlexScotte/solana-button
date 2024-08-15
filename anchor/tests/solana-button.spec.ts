import * as anchor from '@coral-xyz/anchor';
import { SolanaButton } from '../target/types/solana_button';

describe('solana-button', () => {

  const SEED_GLOBAL = "global";
  const SEED_GAME = "game";
  const SEED_VAULT = "vault";
  const DEPOSIT_AMOUNT: number = 1 * anchor.web3.LAMPORTS_PER_SOL;
  // const GAME_TIME_SEC = 24 * 60 * 60;
  const GAME_TIME_SEC: number = 3;

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
  const USER_W_NO_MONEY = anchor.web3.Keypair.generate();

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
  });

  describe('Should initializes the global state correctly', () => {

    it('Should successfully process the initial global state instruction', async () => {

      // Initialize the global state
      const tx = await program.methods
        .initializeGlobalState()
        .accounts({
          globalState: globalStatePda,
          authority: ADMIN_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect(tx).toBeTruthy();
    });

    it('Should set the global state admin to admin public key', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.authority.toBase58()).toBe(ADMIN_PUBKEY.toBase58());
    });

    it('Should set the global state next game id to 0', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.nextGameId.toNumber()).toBe(0);
    });

    it('Should set the global state active game id to None', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.activeGameId).toBeNull();
    });
  });

  describe('Should be possible for Admin to create a new game', () => {

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
    });

    it('Should successfully process a create game instruction', async () => {

      // Execute the create_new_game instruction as admin.
      const tx = await program.methods
        .createNewGame(
          new anchor.BN(DEPOSIT_AMOUNT),
          new anchor.BN(GAME_TIME_SEC)
        )
        .accounts({
          globalState: globalStatePda,
          gameState: currentGameStatePda,
          vault: currentVaultPda,
          user: ADMIN_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect(tx).toBeTruthy();
    });

    it('Should set the global state active game id to the game state id', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(globalStateAccount.activeGameId.toNumber()).toBe(gameStateAccount.gameId.toNumber());
    });

    it('Should set the game state game id to 0', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.gameId.toNumber()).toBe(0);
    });

    it('Should set the game state is active to true', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.isActive).toBe(true);
    });

    it('Should set the game state has ended to false', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(!gameStateAccount.hasEnded);
    });

    it('Should not set the game state last user', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.lastClicker.toBase58()).toBe(anchor.web3.SystemProgram.programId.toBase58());
    });

    it('Should set the game state time in second to the configured value', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.gameTimeSec.toNumber()).toBe(GAME_TIME_SEC);
    });

    it('Should set the global state next game id to 1', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.nextGameId.toNumber()).toBe(1);
    });

    it('Should set the global state active game id to 0', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.activeGameId.toNumber()).toBe(0);
    });

    it('Should fail if creator is not admin', async () => {

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
          .createNewGame(
            new anchor.BN(DEPOSIT_AMOUNT),
            new anchor.BN(GAME_TIME_SEC)
          )
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

    it('Should fail if another game is already active', async () => {

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
          .createNewGame(
            new anchor.BN(DEPOSIT_AMOUNT),
            new anchor.BN(GAME_TIME_SEC)
          )
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

    it('Should set the vault game id to 0', async () => {

      const vaultStateAccount = await program.account.vault.fetch(currentVaultPda);

      expect(vaultStateAccount.gameId.toNumber()).toBe(0);
    });

    it('Should set the vault intiale balance to 0', async () => {

      const vaultStateAccount = await program.account.vault.fetch(currentVaultPda);

      expect(vaultStateAccount.balance.toNumber()).toBe(0);
    });

    it('Should set the vault deposit amount to the configured value', async () => {

      const vaultStateAccount = await program.account.vault.fetch(currentVaultPda);

      expect(vaultStateAccount.depositAmount.toNumber()).toBe(DEPOSIT_AMOUNT);
    });
  });

  describe('Should fail if a User click on button', () => {

    it('Should fail if deposit amount is incorrect', async () => {

      await expect(
        program.methods
          .clickButton(new anchor.BN(99))
          .accounts({
            globalState: globalStatePda,
            gameState: currentGameStatePda,
            vault: currentVaultPda,
            user: USER_1.publicKey,

            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_1])
          .rpc()
      ).rejects.toThrow(/IncorrectDepositAmount/);
    });

    it('Should fail if game is not active', async () => {

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
            globalState: globalStatePda,
            gameState: newGameStateAccount,
            vault: newVaultPda,
            user: USER_1.publicKey,

            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_1])
          .rpc()
      ).rejects.toThrow(/AccountNotInitialized./);
    });

    it('Should fail if User has not enough money', async () => {

      await expect(
        program.methods
          .clickButton(new anchor.BN(DEPOSIT_AMOUNT))
          .accounts({
            globalState: globalStatePda,
            gameState: currentGameStatePda,
            vault: currentVaultPda,
            user: USER_W_NO_MONEY.publicKey,

            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_W_NO_MONEY])
          .rpc()
      ).rejects.toThrow(/InsufficientFunds/);
    });
  });

  describe('Should be possible for User 1 to click on button', () => {

    let vaultAccountBeforeClick;
    let user1InitialeBalance: number;
    let user1ClickButtonDate: number;
    beforeAll(async () => {

      user1InitialeBalance = await provider.connection.getBalance(USER_1.publicKey);

      vaultAccountBeforeClick = await program.account.vault.fetch(currentVaultPda);
    });

    it('Should successfully process a button click by User 1', async () => {

      // Get date time (seconde precision)
      user1ClickButtonDate = Math.floor(Date.now() / 1000);

      const tx = await program.methods
        .clickButton(new anchor.BN(DEPOSIT_AMOUNT))
        .accounts({
          globalState: globalStatePda,
          gameState: currentGameStatePda,
          vault: currentVaultPda,
          user: USER_1.publicKey,

          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([USER_1])
        .rpc()

      expect(tx).toBeTruthy();
    });

    it('Should set the game state last click time stamp', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      // Check if it's closed with margin error of ~2 seconds 
      expect(gameStateAccount.lastClickTimestamp / 4).toBeCloseTo(user1ClickButtonDate / 4, 0);

    });


    it('Should set the game state last clicker to User 1 public key', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.lastClicker.toBase58()).toBe(USER_1.publicKey.toBase58());
    });

    it('Should increase the game state click number and be equal to 1', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.clickNumber.toNumber()).toBe(1);
    });

    it('Should increase the vault balance by the deposit amount', async () => {

      const vaultAccount = await program.account.vault.fetch(currentVaultPda);

      expect(vaultAccount.balance.toNumber()).toBe(vaultAccountBeforeClick.balance.toNumber() + DEPOSIT_AMOUNT);
    });

    it('Should decrease the User 1 balance by the deposit amount', async () => {

      const userBalance = await provider.connection.getBalance(USER_1.publicKey);

      expect(userBalance).toBe(user1InitialeBalance - DEPOSIT_AMOUNT);
    });

    it('Should fail if User 1 is the last clicker', async () => {

      await expect(
        program.methods
          .clickButton(new anchor.BN(DEPOSIT_AMOUNT))
          .accounts({
            globalState: globalStatePda,
            gameState: currentGameStatePda,
            vault: currentVaultPda,
            user: USER_1.publicKey,

            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_1])
          .rpc()
      ).rejects.toThrow(/AlreadyLastClicker/);
    });

  });

  describe('Should be possible for another User 2 to click on button', () => {

    let vaultAccountBeforeClick;
    let user2InitialeBalance: number;
    let user2ClickButtonDate: number;
    beforeAll(async () => {

      user2InitialeBalance = await provider.connection.getBalance(USER_2.publicKey);
      vaultAccountBeforeClick = await program.account.vault.fetch(currentVaultPda);

    });

    it('Should successfully process a button click by User 2', async () => {

      // Get date time (second precision)
      user2ClickButtonDate = Math.floor(Date.now() / 1000);

      const tx = await program.methods
        .clickButton(new anchor.BN(DEPOSIT_AMOUNT))
        .accounts({
          globalState: globalStatePda,
          gameState: currentGameStatePda,
          vault: currentVaultPda,
          user: USER_2.publicKey,

          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([USER_2])
        .rpc()

      expect(tx).toBeTruthy();
    });

    it('Should set the game state last click time stamp', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      // Check if it's closed with margin error of ~2 seconds 
      expect(gameStateAccount.lastClickTimestamp / 4).toBeCloseTo(user2ClickButtonDate / 4, 0);
    });


    it('Should increase the vault balance by the deposit amount', async () => {

      const vaultAccount = await program.account.vault.fetch(currentVaultPda);

      expect(vaultAccount.balance.toNumber()).toBe(vaultAccountBeforeClick.balance.toNumber() + DEPOSIT_AMOUNT);
    });

    it('Should set the game state last clicker to User 2 public key', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.lastClicker.toBase58()).toBe(USER_2.publicKey.toBase58());
    });

    it('Should increase the game state click number and be equal to 2', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.clickNumber.toNumber()).toBe(2);
    });

    it('Should decrease the User 2 balance by the deposit amount', async () => {

      const userBalance = await provider.connection.getBalance(USER_2.publicKey);

      expect(userBalance).toBe(user2InitialeBalance - DEPOSIT_AMOUNT);
    });

    it('Should fail if User 2 is the last clicker', async () => {

      await expect(
        program.methods
          .clickButton(new anchor.BN(DEPOSIT_AMOUNT))
          .accounts({
            globalState: globalStatePda,
            gameState: currentGameStatePda,
            vault: currentVaultPda,
            user: USER_2.publicKey,

            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_2])
          .rpc()
      ).rejects.toThrow(/AlreadyLastClicker/);
    });
  });

  describe('Should end the game correctly', () => {
    beforeAll(async () => {

      // Wait until the countdown is over
      await new Promise(resolve => setTimeout(resolve, (GAME_TIME_SEC + 1) * 1000));
    });

    it('should successfully process the verify game instruction', async () => {

      const tx = await program.methods
        .verifyGameState()
        .accounts({
          globalState: globalStatePda,
          gameState: currentGameStatePda,
        })
        .rpc()

      expect(tx).toBeTruthy();
    });

    it('Should set the game state is active to false', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(!gameStateAccount.isActive);
    });

    it('Should set the game state has ended to true', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);

      expect(gameStateAccount.hasEnded);
    });

    it('Should set the global state active game id to None', async () => {

      const globalStateAccount = await program.account.globalState.fetch(globalStatePda);

      expect(globalStateAccount.activeGameId).toBeNull();;
    });
  });

  describe('Should be possible for the winner to claim the reward', () => {

    let user2InitialeBalance: number;
    let vaultAccountReward: number;
    beforeAll(async () => {
      user2InitialeBalance = await provider.connection.getBalance(USER_2.publicKey);

      const vaultAccount = await program.account.vault.fetch(currentVaultPda);
      vaultAccountReward = vaultAccount.balance.toNumber();
    });

    it('Should fail if Admin trying to transfer funds from the vault', async () => {

      // Get the initial balances
      const initialVaultBalance = await provider.connection.getBalance(currentVaultPda);
      const initialAdminBalance = await provider.connection.getBalance(ADMIN_PUBKEY);

      const latestBlockhashInfo = await provider.connection.getLatestBlockhash("confirmed");

      // Attempt to transfer funds from vault to admin wallet
      const transaction = new anchor.web3.Transaction({
        blockhash: latestBlockhashInfo.blockhash,
        feePayer: ADMIN_PUBKEY,
        lastValidBlockHeight: latestBlockhashInfo.lastValidBlockHeight,
      })
        .add(
          anchor.web3.SystemProgram.transfer({
            fromPubkey: currentVaultPda,
            toPubkey: ADMIN_PUBKEY,
            lamports: initialVaultBalance,
          })
        );

      const signedTransaction = await provider.wallet.signTransaction(transaction);
      let error;
      try {
        await provider.connection.sendRawTransaction(signedTransaction.serialize());
      } catch (e) {
        error = e;
      }

      // Check that an error was thrown
      expect(error).toBeDefined();
      expect(error.message).toContain('Signature verification failed');

      // Verify balances haven't changed
      const finalVaultBalance = await provider.connection.getBalance(currentVaultPda);
      const finalAdminBalance = await provider.connection.getBalance(ADMIN_PUBKEY);

      expect(finalVaultBalance).toBe(initialVaultBalance);
      expect(finalAdminBalance).toBe(initialAdminBalance);
    });

    it('Should fail if User 1 trying to claim the reward (User 2 is the winner)', async () => {

      await expect(
        program.methods
          .claimReward()
          .accounts({
            gameState: currentGameStatePda,
            vault: currentVaultPda,
            user: USER_1.publicKey,

            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([USER_1])
          .rpc()
      ).rejects.toThrow(/NotLastClicker/);
    });

    it('Should have the vault balance > 0', async () => {

      const vaultAccount = await program.account.vault.fetch(currentVaultPda);
      expect(vaultAccount.balance.toNumber()).toBeGreaterThan(0);
    });

    it('should successfully process the claim reward instruction', async () => {

      const tx = await program.methods
        .claimReward()
        .accounts({
          gameState: currentGameStatePda,
          vault: currentVaultPda,
          user: USER_2.publicKey,

          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([USER_2])
        .rpc()

      expect(tx).toBeTruthy();
    });

    it('Should have the game state has ended to true', async () => {

      const gameStateAccount = await program.account.gameState.fetch(currentGameStatePda);
      expect(gameStateAccount.hasEnded);
    });

    it('Should increase the user balance by the vault reward', async () => {

      const user2Balance = await provider.connection.getBalance(USER_2.publicKey);
      expect(user2Balance).toBe(user2InitialeBalance + vaultAccountReward);
    });

    it('Should reset the vault balance', async () => {

      const vaultAccount = await program.account.vault.fetch(currentVaultPda);
      expect(vaultAccount.balance.toNumber()).toBe(0);
    });
  });
});
