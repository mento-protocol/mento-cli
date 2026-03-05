import chalk from 'chalk';

/**
 * Global error handler for CLI commands.
 * Maps known SDK / network error patterns to human-readable messages
 * instead of showing raw stack traces.
 */
export function handleError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  // FX Market closed (Mento SDK error)
  if (lower.includes('fxmarket') || lower.includes('market closed')) {
    console.error(
      chalk.yellow('FX Market is currently closed. Trading is not available for this pair.'),
    );
    process.exit(1);
  }

  // Insufficient balance / funds
  if (lower.includes('insufficient') || lower.includes('exceeds balance')) {
    console.error(chalk.red('Error: Insufficient balance for this transaction.'));
    process.exit(1);
  }

  // Invalid token / not found
  if (lower.includes('token not found') || lower.includes('unknown token')) {
    console.error(chalk.red(`Error: ${message}`));
    console.error(chalk.gray('Hint: Use "mento tokens --all" to see available tokens.'));
    process.exit(1);
  }

  // No route found
  if (lower.includes('no route') || lower.includes('route not found')) {
    console.error(chalk.red(`Error: ${message}`));
    console.error(chalk.gray('Hint: Use "mento routes" to see available trading routes.'));
    process.exit(1);
  }

  // Network / RPC errors
  if (
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed') ||
    lower.includes('network request failed')
  ) {
    console.error(chalk.red('Error: Network connection failed.'));
    console.error(chalk.gray(`Details: ${message}`));
    console.error(
      chalk.gray('Check your internet connection or try a different RPC with --rpc <url>.'),
    );
    process.exit(1);
  }

  // Chain resolution errors
  if (lower.includes('unknown chain')) {
    console.error(chalk.red(`Error: ${message}`));
    console.error(chalk.gray('Supported chains: celo, celo-sepolia, or a numeric chain ID.'));
    process.exit(1);
  }

  // Wallet / private key errors
  if (lower.includes('private key') || lower.includes('keyfile')) {
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }

  // Revert / contract errors
  if (lower.includes('revert') || lower.includes('execution reverted')) {
    console.error(chalk.red('Error: Transaction reverted on-chain.'));
    console.error(chalk.gray(`Details: ${message}`));
    process.exit(1);
  }

  // Default: show the error message without stack trace
  console.error(chalk.red(`Error: ${message}`));
  process.exit(1);
}
