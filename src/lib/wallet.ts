import { createWalletClient, http, type WalletClient, type Account } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChainConfig } from '@mento-protocol/mento-sdk';
import chalk from 'chalk';
import * as fs from 'node:fs';

export interface WalletOptions {
  privateKey?: string;
  keyfile?: string;
}

/**
 * Load a private key from either --private-key flag or --keyfile path.
 * Warns when using raw --private-key and recommends keyfile instead.
 */
function loadPrivateKey(options: WalletOptions): `0x${string}` {
  if (options.privateKey && options.keyfile) {
    throw new Error('Provide either --private-key or --keyfile, not both.');
  }

  if (!options.privateKey && !options.keyfile) {
    throw new Error('A wallet is required. Provide --private-key or --keyfile.');
  }

  let key: string;

  if (options.keyfile) {
    const filePath = options.keyfile;
    if (!fs.existsSync(filePath)) {
      throw new Error(`Keyfile not found: ${filePath}`);
    }
    key = fs.readFileSync(filePath, 'utf-8').trim();
  } else {
    console.error(
      chalk.yellow(
        'Warning: Using --private-key on the command line is insecure. ' +
          'Consider using --keyfile instead.',
      ),
    );
    key = options.privateKey!;
  }

  // Normalize: ensure 0x prefix
  if (!key.startsWith('0x')) {
    key = `0x${key}`;
  }

  // Basic validation
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('Invalid private key format. Expected 64 hex characters (with or without 0x prefix).');
  }

  return key as `0x${string}`;
}

/**
 * Create a viem WalletClient from CLI wallet options for the given chain.
 */
export function createWallet(
  chainId: number,
  options: WalletOptions,
  rpcUrl?: string,
): { walletClient: WalletClient; account: Account } {
  const privateKey = loadPrivateKey(options);
  const account = privateKeyToAccount(privateKey);
  const chain = getChainConfig(chainId);

  const transport = rpcUrl ? http(rpcUrl) : http();

  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  });

  return { walletClient, account };
}
