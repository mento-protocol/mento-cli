import Table from 'cli-table3';
import chalk from 'chalk';

/**
 * Format an address by truncating the middle.
 * e.g., 0x1234...abcd
 */
export function formatAddress(address: string, chars: number = 6): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a token amount from a raw bigint/string value with the given decimals.
 * Returns a human-readable string with commas and specified decimal places.
 */
export function formatTokenAmount(
  rawAmount: string | bigint,
  decimals: number,
  displayDecimals: number = 2
): string {
  const raw = typeof rawAmount === 'bigint' ? rawAmount.toString() : rawAmount;

  if (raw === '0') return '0';

  // Pad if necessary
  const padded = raw.padStart(decimals + 1, '0');
  const integerPart = padded.slice(0, padded.length - decimals) || '0';
  const fractionalPart = padded.slice(padded.length - decimals);

  // Format integer part with commas
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (displayDecimals === 0) return formattedInteger;

  const truncatedFraction = fractionalPart.slice(0, displayDecimals);
  return `${formattedInteger}.${truncatedFraction}`;
}

/**
 * Create a cli-table3 table with the given headers.
 */
export function createTable(headers: string[]): Table.Table {
  return new Table({
    head: headers.map(h => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
    },
  });
}

/**
 * Output data as either a formatted table or JSON, depending on the --json flag.
 */
export function output(
  data: Record<string, unknown>[],
  headers: string[],
  rows: string[][],
  jsonMode: boolean
): void {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const table = createTable(headers);
  for (const row of rows) {
    table.push(row);
  }
  console.log(table.toString());
}
