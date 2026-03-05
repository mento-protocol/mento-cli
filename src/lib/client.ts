import { Mento, ChainId } from '@mento-protocol/mento-sdk';

export interface GlobalOptions {
  chain: string;
  rpc?: string;
  json?: boolean;
}

const CHAIN_REGISTRY: Record<string, number> = {
  'celo': ChainId.CELO,
  'celo-sepolia': ChainId.CELO_SEPOLIA,
};

let cachedMento: Mento | null = null;
let cachedChainId: number | null = null;

/**
 * Resolve a chain name or numeric ID string to a ChainId number.
 */
export function resolveChainId(chain: string): number {
  const lower = chain.toLowerCase();
  if (CHAIN_REGISTRY[lower] !== undefined) {
    return CHAIN_REGISTRY[lower];
  }
  const numeric = parseInt(chain, 10);
  if (!isNaN(numeric)) {
    return numeric;
  }
  throw new Error(`Unknown chain: "${chain}". Use celo, celo-sepolia, or a numeric chain ID.`);
}

/**
 * Get or create a Mento SDK instance based on global CLI options.
 * Caches the instance so multiple commands don't recreate it.
 */
export async function getMento(options: GlobalOptions): Promise<Mento> {
  const chainId = resolveChainId(options.chain);

  // Return cached instance if same chain
  if (cachedMento && cachedChainId === chainId) {
    return cachedMento;
  }

  if (options.rpc) {
    cachedMento = await Mento.create(chainId, options.rpc);
  } else {
    cachedMento = await Mento.create(chainId);
  }

  cachedChainId = chainId;
  return cachedMento;
}
