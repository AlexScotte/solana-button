/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solana_button.json`.
 */
export type SolanaButton = {
  "address": "7zWaRVHxPeM3onPKRtJPzJfWTppwX4JimBj1oq2yDXzY",
  "metadata": {
    "name": "solanaButton",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createNewGame",
      "discriminator": [
        125,
        123,
        146,
        199,
        15,
        252,
        11,
        68
      ],
      "accounts": [
        {
          "name": "state",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "gameState",
      "discriminator": [
        144,
        94,
        208,
        172,
        248,
        99,
        134,
        120
      ]
    }
  ],
  "types": [
    {
      "name": "gameState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lastUser",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
