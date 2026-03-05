import { Command } from 'commander';
import chalk from 'chalk';
import { getMento, type GlobalOptions } from '../lib/client.js';
import { formatAddress, formatTokenAmount, output } from '../lib/format.js';
import { handleError } from '../lib/errors.js';
import type { StableToken, CollateralAsset } from '@mento-protocol/mento-sdk';

interface TokensOptions {
  collateral?: boolean;
  all?: boolean;
}

export function registerTokensCommand(program: Command): void {
  program
    .command('tokens')
    .description('List tokens known to the Mento Protocol (stable tokens by default)')
    .option('-c, --collateral', 'List collateral assets instead of stable tokens')
    .option('-a, --all', 'List both stable tokens and collateral assets')
    .addHelpText('after', `
Examples:
  $ mento tokens              List stable tokens
  $ mento tokens --collateral List collateral assets
  $ mento tokens --all        List all tokens (stable + collateral)
  $ mento tokens --json       Output as JSON
`)
    .action(async (options: TokensOptions) => {
      const globalOpts = program.opts<GlobalOptions>();

      try {
        const mento = await getMento(globalOpts);
        const jsonMode = globalOpts.json ?? false;

        const showStables = options.all || !options.collateral;
        const showCollateral = options.all || options.collateral;

        if (showStables) {
          await listStableTokens(mento, jsonMode);
        }

        if (showCollateral) {
          if (showStables) console.log(''); // spacer between sections
          await listCollateralAssets(mento, jsonMode);
        }
      } catch (err) {
        handleError(err);
      }
    });
}

async function listStableTokens(mento: { tokens: { getStableTokens: (includeSupply?: boolean) => Promise<StableToken[]> } }, jsonMode: boolean): Promise<void> {
  const tokens = await mento.tokens.getStableTokens(true);

  if (!jsonMode) {
    console.log(chalk.bold('Stable Tokens'));
    console.log(chalk.gray(`Found ${tokens.length} stable token(s)\n`));
  }

  const headers = ['Symbol', 'Name', 'Address', 'Decimals', 'Supply'];
  const rows = tokens.map((t) => [
    chalk.green(t.symbol),
    t.name,
    formatAddress(t.address),
    String(t.decimals),
    formatTokenAmount(t.totalSupply, t.decimals),
  ]);

  const data = tokens.map((t) => ({
    symbol: t.symbol,
    name: t.name,
    address: t.address,
    decimals: t.decimals,
    totalSupply: t.totalSupply,
  }));

  output(data, headers, rows, jsonMode);
}

async function listCollateralAssets(mento: { tokens: { getCollateralAssets: () => Promise<CollateralAsset[]> } }, jsonMode: boolean): Promise<void> {
  const assets = await mento.tokens.getCollateralAssets();

  if (!jsonMode) {
    console.log(chalk.bold('Collateral Assets'));
    console.log(chalk.gray(`Found ${assets.length} collateral asset(s)\n`));
  }

  const headers = ['Symbol', 'Name', 'Address', 'Decimals'];
  const rows = assets.map((t) => [
    chalk.yellow(t.symbol),
    t.name,
    formatAddress(t.address),
    String(t.decimals),
  ]);

  const data = assets.map((t) => ({
    symbol: t.symbol,
    name: t.name,
    address: t.address,
    decimals: t.decimals,
  }));

  output(data, headers, rows, jsonMode);
}
