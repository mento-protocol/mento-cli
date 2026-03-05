import { Command } from 'commander';
import chalk from 'chalk';
import { getMento, resolveChainId, type GlobalOptions } from '../lib/client.js';
import { formatAddress, output } from '../lib/format.js';
import { resolveToken } from '../lib/utils.js';
import { handleError } from '../lib/errors.js';
import type { Pool, TradingLimit, PoolTradabilityStatus } from '@mento-protocol/mento-sdk';

function getTokenSymbol(chainId: number, address: string): string {
  const token = resolveToken(chainId, address);
  return token?.symbol ?? formatAddress(address);
}

function formatLimitValue(value: bigint, decimals: number): string {
  if (value === 0n) return '0';
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) return whole.toString();
  const fracStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

function formatResetTime(until: number): string {
  if (until === 0) return 'N/A';
  const date = new Date(until * 1000);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function limitsToData(
  pool: Pool,
  status: PoolTradabilityStatus,
  chainId: number,
): Record<string, unknown> {
  return {
    poolAddr: pool.poolAddr,
    token0: pool.token0,
    token0Symbol: getTokenSymbol(chainId, pool.token0),
    token1: pool.token1,
    token1Symbol: getTokenSymbol(chainId, pool.token1),
    poolType: pool.poolType,
    tradable: status.tradable,
    circuitBreakerOk: status.circuitBreakerOk,
    tradingMode: status.tradingMode,
    limitsOk: status.limitsOk,
    limits: status.limits.map((l) => ({
      asset: l.asset,
      assetSymbol: getTokenSymbol(chainId, l.asset),
      maxIn: l.maxIn.toString(),
      maxOut: l.maxOut.toString(),
      until: l.until,
      decimals: l.decimals,
    })),
  };
}

function formatTradable(ok: boolean): string {
  return ok ? chalk.green('✓ Tradable') : chalk.red('✗ Suspended');
}

function formatLimitsStatus(ok: boolean): string {
  return ok ? chalk.green('OK') : chalk.red('Exhausted');
}

function printLimitRow(limit: TradingLimit, chainId: number): void {
  const symbol = getTokenSymbol(chainId, limit.asset);
  const maxIn = formatLimitValue(limit.maxIn, limit.decimals);
  const maxOut = formatLimitValue(limit.maxOut, limit.decimals);
  const reset = formatResetTime(limit.until);
  console.log(`    Asset:  ${symbol} (${formatAddress(limit.asset)})`);
  console.log(`    Max In: ${maxIn}  |  Max Out: ${maxOut}`);
  console.log(`    Resets: ${reset}`);
}

export function registerTradingCommand(program: Command): void {
  const trading = program
    .command('trading')
    .description('Check trading status and limits for Mento pools')
    .addHelpText('after', `
Examples:
  $ mento trading status                Check all routes trading status
  $ mento trading status USDm CELO      Check if USDm/CELO pair is tradable
  $ mento trading limits                Show trading limits for all pools
  $ mento trading limits --json         Output limits as JSON
`);

  // mento trading status [tokenA] [tokenB]
  trading
    .command('status [tokenA] [tokenB]')
    .description('Check trading status for a pair or all routes')
    .action(async (tokenA?: string, tokenB?: string) => {
      const globalOpts = program.opts<GlobalOptions>();

      try {
        const mento = await getMento(globalOpts);
        const jsonMode = globalOpts.json ?? false;
        const chainId = resolveChainId(globalOpts.chain);

        if (tokenA && tokenB) {
          // Check specific pair
          const resolvedA = resolveToken(chainId, tokenA);
          const resolvedB = resolveToken(chainId, tokenB);

          if (!resolvedA) {
            console.error(chalk.red(`Error: Token not found: ${tokenA}`));
            process.exit(1);
          }
          if (!resolvedB) {
            console.error(chalk.red(`Error: Token not found: ${tokenB}`));
            process.exit(1);
          }

          const tradable = await mento.trading.isPairTradable(resolvedA.address, resolvedB.address);

          if (jsonMode) {
            console.log(
              JSON.stringify(
                {
                  tokenA: { symbol: resolvedA.symbol, address: resolvedA.address },
                  tokenB: { symbol: resolvedB.symbol, address: resolvedB.address },
                  tradable,
                },
                null,
                2,
              ),
            );
            return;
          }

          const status = tradable ? chalk.green('✓ Tradable') : chalk.red('✗ Suspended');
          console.log(chalk.bold(`Trading Status: ${resolvedA.symbol} ↔ ${resolvedB.symbol}`));
          console.log(`Status: ${status}`);
          return;
        }

        // Check all routes
        const routes = await mento.routes.getRoutes();

        if (!jsonMode) {
          console.log(chalk.bold('Trading Status — All Routes'));
          console.log(chalk.gray(`Checking ${routes.length} route(s)...\n`));
        }

        const results: Array<{ route: string; tokenA: string; tokenB: string; tradable: boolean }> =
          [];

        for (const route of routes) {
          const tradable = await mento.trading.isRouteTradable(route);
          results.push({
            route: route.id,
            tokenA: route.tokens[0].symbol,
            tokenB: route.tokens[1].symbol,
            tradable,
          });
        }

        if (jsonMode) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        const headers = ['Route ID', 'Token A', 'Token B', 'Status'];
        const rows = results.map((r) => [
          r.route,
          r.tokenA,
          r.tokenB,
          r.tradable ? chalk.green('✓ Tradable') : chalk.red('✗ Suspended'),
        ]);
        output(results, headers, rows, false);
      } catch (err) {
        handleError(err);
      }
    });

  // mento trading limits
  trading
    .command('limits')
    .description('Show trading limits for all pools')
    .action(async () => {
      const globalOpts = program.opts<GlobalOptions>();

      try {
        const mento = await getMento(globalOpts);
        const jsonMode = globalOpts.json ?? false;
        const chainId = resolveChainId(globalOpts.chain);

        const pools = await mento.pools.getPools();

        if (!jsonMode) {
          console.log(chalk.bold('Trading Limits — All Pools'));
          console.log(chalk.gray(`Checking ${pools.length} pool(s)...\n`));
        }

        const allData: Record<string, unknown>[] = [];

        for (const pool of pools) {
          const status = await mento.trading.getPoolTradabilityStatus(pool);
          const sym0 = getTokenSymbol(chainId, pool.token0);
          const sym1 = getTokenSymbol(chainId, pool.token1);

          allData.push(limitsToData(pool, status, chainId));

          if (!jsonMode) {
            const tradableStr = formatTradable(status.tradable);
            const cbStr = status.circuitBreakerOk
              ? chalk.green('OK')
              : chalk.red('Tripped');
            const limStr = formatLimitsStatus(status.limitsOk);

            console.log(
              chalk.bold(`${sym0}/${sym1}`) +
                chalk.gray(` (${pool.poolType}) — ${formatAddress(pool.poolAddr)}`),
            );
            console.log(`  Overall:         ${tradableStr}`);
            console.log(`  Circuit Breaker: ${cbStr}`);
            console.log(`  Limits:          ${limStr}`);

            if (status.limits.length > 0) {
              console.log(`  Trading Limits:`);
              for (const limit of status.limits) {
                printLimitRow(limit, chainId);
              }
            } else {
              console.log(`  Trading Limits:  None configured`);
            }
            console.log('');
          }
        }

        if (jsonMode) {
          console.log(JSON.stringify(allData, null, 2));
        }
      } catch (err) {
        handleError(err);
      }
    });
}
