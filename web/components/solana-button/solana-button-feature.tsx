'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { ExplorerLink } from '../cluster/cluster-ui';
import { WalletButton } from '../solana/solana-provider';
import { AppHero, ellipsify } from '../ui/ui-layout';
import { useSolanaButtonProgram } from './solana-button-data-access';
import { SolanaButtonCreate, SolanaButtonProgram } from './solana-button-ui';

export default function SolanaButtonFeature() {
  const { publicKey } = useWallet();
  const { programId } = useSolanaButtonProgram();

  return publicKey ? (
    <div>
      <AppHero
        title="SolanaButton"
        subtitle={'Run the program by clicking the "Run program" button.'}
      >
        <p className="mb-6">
          <ExplorerLink
            path={`account/${programId}`}
            label={ellipsify(programId.toString())}
          />
        </p>
        <SolanaButtonCreate />
      </AppHero>
      <SolanaButtonProgram />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton className="btn btn-primary" />
        </div>
      </div>
    </div>
  );
}
