import { Command } from 'commander';
import chalk from 'chalk';
import { getMento, resolveChainId, type GlobalOptions } from '../lib/client.js';
import { output, formatAddress } from '../lib/format.js';
import { resolveToken } from '../lib/utils.js';
import { handleError } from '../lib/errors.js';
import type { Pool, PoolDetails, FPMMPoolDetails, VirtualPoolDetails } from '@mento-protocol/mento-sdk';

interface PoolsOptions {
  type?: string;
  details?: string;
}

function getTokenSymbol(chainId: number, address: string): string {
  const token = resolveToken(chainId, address);
  return token?.symbol ?? formatAddress(address);
}

function poolToRow(pool: Pool, chainId: number): string[] {
  return [
    formatAddress(pool.poolAddr),
    getTokenSymbol(chainId, pool.token0),
    getTokenSymbol(chainId, pool.token1),
    pool.poolType,
  ];
}

function poolToData(pool: Pool, chainId: number): Record<string, unknown> {
  return {
    poolAddr: pool.poolAddr,
    token0: pool.token0,
    token0Symbol: getTokenSymbol(chainId, pool.token0),
    token1: pool.token1,
    token1Symbol: getTokenSymbol(chainId, pool.token1),
    poolType: pool.poolType,
    factoryAddr: pool.factoryAddr,
    ...(pool.exchangeId ? { exchangeId: pool.exchangeId } : {}),
  };
}

function formatFPMMDetails(details: FPMMPoolDetails): void {
  console.log(chalk.bold('FPMM Pool Details'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`Pool Address:  ${details.poolAddr}`);
  console.log(`Factory:       ${details.factoryAddr}`);
  console.log(`Token0:        ${details.token0}`);
  console.log(`Token1:        ${details.token1}`);
  console.log('');

  if (details.pricing) {
    console.log(chalk.bold('Pricing'));
    console.log(`  Oracle Price:   ${details.pricing.oraclePrice.toFixed(6)}`);
    console.log(`  Reserve Price:  ${details.pricing.reservePrice.toFixed(6)}`);
    console.log(`  Price Diff:     ${details.pricing.priceDifferencePercent.toFixed(4)}%`);
    console.log(`  In Band:        ${details.rebalancing.inBand ?? 'N/A'}`);
  } else {
    console.log(chalk.yellow(`Pricing unavailable: ${details.pricingUnavailableReason ?? 'unknown'}`));
  }
  console.log('');

  console.log(chalk.bold('Fees'));
  console.log(`  LP Fee:       ${details.fees.lpFeePercent}%`);
  console.log(`  Protocol Fee: ${details.fees.protocolFeePercent}%`);
  console.log(`  Total Fee:    ${details.fees.totalFeePercent}%`);
  console.log('');

  console.log(chalk.bold('Rebalancing'));
  console.log(`  Incentive:      ${details.rebalancing.rebalanceIncentivePercent}%`);
  console.log(`  Threshold Above: ${details.rebalancing.rebalanceThresholdAbovePercent}%`);
  console.log(`  Threshold Below: ${details.rebalancing.rebalanceThresholdBelowPercent}%`);
  if (details.rebalancing.liquidityStrategy) {
    console.log(`  Liquidity Strategy: ${details.rebalancing.liquidityStrategy}`);
  }
}

function formatVirtualDetails(details: VirtualPoolDetails): void {
  console.log(chalk.bold('Virtual Pool Details'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`Pool Address:  ${details.poolAddr}`);
  console.log(`Factory:       ${details.factoryAddr}`);
  console.log(`Token0:        ${details.token0}`);
  console.log(`Token1:        ${details.token1}`);
  if (details.exchangeId) {
    console.log(`Exchange ID:   ${details.exchangeId}`);
  }
  console.log('');
  console.log(chalk.bold('Configuration'));
  console.log(`  Spread:     ${details.spreadPercent}%`);
  console.log(`  Reserve0:   ${details.reserve0.toString()}`);
  console.log(`  Reserve1:   ${details.reserve1.toString()}`);
}

function poolDetailsToData(details: PoolDetails): Record<string, unknown> {
  if (details.poolType === 'FPMM') {
    const d = details as FPMMPoolDetails;
    return {
      poolAddr: d.poolAddr,
      poolType: d.poolType,
      factoryAddr: d.factoryAddr,
      token0: d.token0,
      token1: d.token1,
      reserve0: d.reserve0.toString(),
      reserve1: d.reserve1.toString(),
      pricing: d.pricing
        ? {
            oraclePrice: d.pricing.oraclePrice,
            reservePrice: d.pricing.reservePrice,
            priceDifferencePercent: d.pricing.priceDifferencePercent,
          }
        : null,
      pricingUnavailableReason: d.pricingUnavailableReason,
      fees: {
        lpFeePercent: d.fees.lpFeePercent,
        protocolFeePercent: d.fees.protocolFeePercent,
        totalFeePercent: d.fees.totalFeePercent,
      },
      rebalancing: {
        rebalanceIncentivePercent: d.rebalancing.rebalanceIncentivePercent,
        rebalanceThresholdAbovePercent: d.rebalancing.rebalanceThresholdAbovePercent,
        rebalanceThresholdBelowPercent: d.rebalancing.rebalanceThresholdBelowPercent,
        inBand: d.rebalancing.inBand,
        liquidityStrategy: d.rebalancing.liquidityStrategy,
      },
    };
  } else {
    const d = details as VirtualPoolDetails;
    return {
      poolAddr: d.poolAddr,
      poolType: d.poolType,
      factoryAddr: d.factoryAddr,
      token0: d.token0,
      token1: d.token1,
      exchangeId: d.exchangeId,
      reserve0: d.reserve0.toString(),
      reserve1: d.reserve1.toString(),
      spreadPercent: d.spreadPercent,
    };
  }
}

export function registerPoolsCommand(program: Command): void {
  program
    .command('pools')
    .description('List liquidity pools in the Mento Protocol')
    .option('--type <type>', 'Filter by pool type: fpmm or virtual')
    .option('--details <address>', 'Show detailed on-chain config for a specific pool address')
    .addHelpText('after', `
Examples:
  $ mento pools                     List all pools
  $ mento pools --type fpmm         List FPMM pools only
  $ mento pools --type virtual      List Virtual pools only
  $ mento pools --details 0x1234... Show detailed config for a specific pool
  $ mento pools --json              Output as JSON
`)
    .action(async (options: PoolsOptions) => {
      const globalOpts = program.opts<GlobalOptions>();

      try {
        const mento = await getMento(globalOpts);
        const jsonMode = globalOpts.json ?? false;
        const chainId = resolveChainId(globalOpts.chain);

        if (options.details) {
          // Show detailed info for a single pool
          const details = await mento.pools.getPoolDetails(options.details);

          if (jsonMode) {
            console.log(JSON.stringify(poolDetailsToData(details), null, 2));
            return;
          }

          if (details.poolType === 'FPMM') {
            formatFPMMDetails(details as FPMMPoolDetails);
          } else {
            formatVirtualDetails(details as VirtualPoolDetails);
          }
          return;
        }

        // List all pools (with optional type filter)
        let pools = await mento.pools.getPools();

        if (options.type) {
          const filter = options.type.toLowerCase();
          if (filter !== 'fpmm' && filter !== 'virtual') {
            console.error(chalk.red('Error: --type must be "fpmm" or "virtual"'));
            process.exit(1);
          }
          const normalizedFilter = filter === 'fpmm' ? 'FPMM' : 'Virtual';
          pools = pools.filter((p) => p.poolType === normalizedFilter);
        }

        if (!jsonMode) {
          const label = options.type
            ? `${options.type.toUpperCase()} Pools`
            : 'All Pools';
          console.log(chalk.bold(label));
          console.log(chalk.gray(`Found ${pools.length} pool(s)\n`));
        }

        const headers = ['Pool Address', 'Token0', 'Token1', 'Pool Type'];
        const rows = pools.map((p) => poolToRow(p, chainId));
        const data = pools.map((p) => poolToData(p, chainId));
        output(data, headers, rows, jsonMode);
      } catch (err) {
        handleError(err);
      }
    });
}
