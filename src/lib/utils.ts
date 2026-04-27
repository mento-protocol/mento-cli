import { getCachedTokens, type Mento, type Token } from '@mento-protocol/mento-sdk';
import { formatAddress } from './format.js';

const resolvedCollateral = new Map<number, Token[]>();
const inFlight = new Map<number, Promise<Token[]>>();

/**
 * Fetch and cache the collateral asset list for a chain. Concurrent first
 * calls share a single in-flight RPC. After the first await resolves, the
 * collateral list is available for `resolveTokenSync` on this chain.
 */
export function prefetchTokens(mento: Mento, chainId: number): Promise<Token[]> {
  const cached = resolvedCollateral.get(chainId);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(chainId);
  if (pending) return pending;

  const fetch = mento.tokens
    .getCollateralAssets()
    .then((tokens) => {
      resolvedCollateral.set(chainId, tokens);
      return tokens;
    })
    .finally(() => {
      inFlight.delete(chainId);
    });
  inFlight.set(chainId, fetch);
  return fetch;
}

function findToken(tokens: readonly Token[], input: string): Token | undefined {
  const needle = input.toLowerCase();
  if (input.startsWith('0x')) {
    return tokens.find((t) => t.address.toLowerCase() === needle);
  }
  return tokens.find((t) => t.symbol.toLowerCase() === needle);
}

/**
 * Resolve by symbol or address against stable tokens (SDK cache) and
 * collateral assets. Returns `undefined` if `prefetchTokens` has not been
 * awaited for this chain or the token is genuinely unknown.
 */
export function resolveTokenSync(chainId: number, input: string): Token | undefined {
  return (
    findToken(getCachedTokens(chainId), input) ??
    findToken(resolvedCollateral.get(chainId) ?? [], input)
  );
}

/**
 * Async resolver — only prefetches collateral if the token isn't already
 * known via stables or a previously-resolved collateral cache.
 */
export async function resolveToken(
  mento: Mento,
  chainId: number,
  input: string,
): Promise<Token | undefined> {
  const cached = resolveTokenSync(chainId, input);
  if (cached) return cached;
  await prefetchTokens(mento, chainId);
  return resolveTokenSync(chainId, input);
}

/**
 * Render-time helper: returns the token symbol for an address, falling back to
 * an abbreviated address when the token isn't known. Requires `prefetchTokens`
 * to have completed for this chain.
 */
export function tokenSymbolOrAddress(chainId: number, address: string): string {
  return resolveTokenSync(chainId, address)?.symbol ?? formatAddress(address);
}
