// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import * as anchor from '@coral-xyz/anchor';
import bs58 from "bs58";
import "dotenv/config";

import { initializeAnchor } from './anchorConfig';

async function main() {

    const { provider, program, wallet } = await initializeAnchor();

}

main().catch((error) => {
    console.error("An error occurred:", error);
});
