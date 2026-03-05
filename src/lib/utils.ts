import { getCachedTokens, type Token } from '@mento-protocol/mento-sdk';

/**
 * Resolve a token symbol to a Token object using the SDK's cached token data.
 * Case-insensitive matching.
 */
export function resolveTokenBySymbol(
  chainId: number,
  symbol: string
): Token | undefined {
  const tokens = getCachedTokens(chainId);
  return tokens.find(
    (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

/**
 * Resolve a token by address or symbol.
 * If the input looks like an address (starts with 0x), match by address.
 * Otherwise, match by symbol.
 */
export function resolveToken(
  chainId: number,
  input: string
): Token | undefined {
  const tokens = getCachedTokens(chainId);
  if (input.startsWith('0x')) {
    return tokens.find(
      (t) => t.address.toLowerCase() === input.toLowerCase()
    );
  }
  return resolveTokenBySymbol(chainId, input);
}
