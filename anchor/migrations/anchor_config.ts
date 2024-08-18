import * as anchor from '@coral-xyz/anchor';
import { clusterApiUrl } from "@solana/web3.js";
import { SolanaButton } from '../target/types/solana_button';
import bs58 from "bs58";

import "dotenv/config";


const os = require("os");
const path = require("path");
const fs = require("fs");


export async function initializeAnchor() {

    const connection = new anchor.web3.Connection(clusterApiUrl("devnet"), "confirmed");

    // // Get wallet from file
    // const homeDir = os.homedir();
    // const walletPath = path.join(homeDir, '.config', 'solana', 'id.json');
    // console.log('Attempting to read wallet from:', walletPath);
    // if (require(fs).existsSync(walletPath)) {
    //   console.log('Wallet file exists');
    //   const walletKeypair = JSON.parse(require(fs).readFileSync(walletPath, 'utf-8'));
    //   const pk = bs58.encode(walletKeypair);
    // } else {
    //   console.error('Wallet file does not exist at the specified path');
    // }

    const walletKP = anchor.web3.Keypair.fromSecretKey(bs58.decode(process.env.ADMIN_PRIVATE_KEY));

    const wallet = new anchor.Wallet(walletKP as any);
    console.log("Wallet:", wallet.publicKey.toBase58());

    const provider = new anchor.AnchorProvider(connection, wallet, {
        preflightCommitment: "processed",
        commitment: "confirmed",
    });
    anchor.setProvider(provider);

    const idl = JSON.parse(
        fs.readFileSync("./target/idl/solana_button.json", "utf8")
    );

    const program = new anchor.Program<SolanaButton>(idl, provider);
    console.log("Program ID:", program.programId.toBase58());

    return { provider, program, wallet };
}