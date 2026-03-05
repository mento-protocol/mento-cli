import { Command } from 'commander';
import chalk from 'chalk';
import { getMento, resolveChainId, type GlobalOptions } from '../lib/client.js';
import { formatTokenAmount, output } from '../lib/format.js';
import { resolveToken } from '../lib/utils.js';
import { handleError } from '../lib/errors.js';
import type { Route } from '@mento-protocol/mento-sdk';

interface QuoteOptions {
  allRoutes?: boolean;
}

function parseAmount(amountStr: string, decimals: number): bigint {
  // Support decimal input like "1.5"
  const [intPart, fracPart = ''] = amountStr.split('.');
  const paddedFrac = fracPart.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(intPart) * BigInt(10 ** decimals) + BigInt(paddedFrac);
}

function calcEffectivePrice(amountIn: bigint, amountOut: bigint, decimalsIn: number, decimalsOut: number): string {
  if (amountOut === BigInt(0)) return 'N/A';
  // price = amountOut / amountIn (in human units)
  // Use integer math: multiply by 1e6 for precision
  const precision = BigInt(1_000_000);
  const priceRaw = (amountOut * precision * BigInt(10 ** decimalsIn)) / (amountIn * BigInt(10 ** decimalsOut));
  const whole = priceRaw / precision;
  const frac = priceRaw % precision;
  return `${whole}.${frac.toString().padStart(6, '0').slice(0, 4)}`;
}

export function registerQuoteCommand(program: Command): void {
  program
    .command('quote <tokenIn> <tokenOut> <amount>')
    .description('Get a swap quote between two tokens')
    .option('--all-routes', 'Quote all available routes and rank by output amount')
    .addHelpText('after', `
Examples:
  $ mento quote USDm CELO 100              Get best quote for 100 USDm -> CELO
  $ mento quote CELO USDm 50               Get best quote for 50 CELO -> USDm
  $ mento quote USDm CELO 100 --all-routes Compare quotes across all routes
  $ mento quote USDm CELO 100 --json       Output as JSON
`)
    .action(async (tokenInSymbol: string, tokenOutSymbol: string, amountStr: string, options: QuoteOptions) => {
      const globalOpts = program.opts<GlobalOptions>();

      try {
        const mento = await getMento(globalOpts);
        const jsonMode = globalOpts.json ?? false;
        const chainId = resolveChainId(globalOpts.chain);

        const tokenIn = resolveToken(chainId, tokenInSymbol);
        const tokenOut = resolveToken(chainId, tokenOutSymbol);

        if (!tokenIn) {
          console.error(chalk.red(`Error: Token not found: ${tokenInSymbol}`));
          process.exit(1);
        }
        if (!tokenOut) {
          console.error(chalk.red(`Error: Token not found: ${tokenOutSymbol}`));
          process.exit(1);
        }

        const amountIn = parseAmount(amountStr, tokenIn.decimals);

        if (options.allRoutes) {
          // Get all routes and quote each one
          const allRoutes = await mento.routes.getRoutes();
          const pairRoutes = [...allRoutes].filter((r) => {
            const addrs = r.tokens.map((t) => t.address.toLowerCase());
            return (
              (addrs[0] === tokenIn.address.toLowerCase() && addrs[1] === tokenOut.address.toLowerCase()) ||
              (addrs[1] === tokenIn.address.toLowerCase() && addrs[0] === tokenOut.address.toLowerCase())
            );
          });

          if (pairRoutes.length === 0) {
            console.error(chalk.red(`No routes found between ${tokenInSymbol} and ${tokenOutSymbol}`));
            process.exit(1);
          }

          interface RouteQuote {
            routeId: string;
            hops: number;
            poolTypes: string;
            amountOut: bigint;
            amountOutFormatted: string;
            effectivePrice: string;
            error?: string;
          }

          const results: RouteQuote[] = [];

          for (const route of pairRoutes) {
            try {
              const amountOut = await mento.quotes.getAmountOut(
                tokenIn.address,
                tokenOut.address,
                amountIn,
                route as Route
              );
              const poolTypes = [...new Set(route.path.map((p) => p.poolType))].join(', ');
              results.push({
                routeId: route.id,
                hops: route.path.length,
                poolTypes,
                amountOut,
                amountOutFormatted: formatTokenAmount(amountOut, tokenOut.decimals, 6),
                effectivePrice: calcEffectivePrice(amountIn, amountOut, tokenIn.decimals, tokenOut.decimals),
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              const isFxClosed = message.toLowerCase().includes('fxmarket') || message.toLowerCase().includes('market closed');
              results.push({
                routeId: route.id,
                hops: route.path.length,
                poolTypes: [...new Set(route.path.map((p) => p.poolType))].join(', '),
                amountOut: BigInt(0),
                amountOutFormatted: 'N/A',
                effectivePrice: 'N/A',
                error: isFxClosed ? 'FX Market Closed' : message,
              });
            }
          }

          // Sort: successful quotes first by amountOut desc
          results.sort((a, b) => {
            if (a.error && !b.error) return 1;
            if (!a.error && b.error) return -1;
            return b.amountOut > a.amountOut ? 1 : b.amountOut < a.amountOut ? -1 : 0;
          });

          if (!jsonMode) {
            console.log(chalk.bold(`\nQuotes: ${amountStr} ${tokenInSymbol} → ${tokenOutSymbol}`));
            console.log(chalk.gray(`${results.length} route(s) found\n`));
          }

          const headers = ['Route ID', 'Hops', 'Pool Types', `Out (${tokenOutSymbol})`, 'Price', 'Status'];
          const rows = results.map((r, i) => [
            i === 0 && !r.error ? chalk.green(r.routeId) : r.routeId,
            String(r.hops),
            r.poolTypes,
            r.error ? chalk.red('N/A') : chalk.green(r.amountOutFormatted),
            r.effectivePrice,
            r.error ? chalk.red(r.error) : chalk.green('OK'),
          ]);
          const data = results.map((r) => ({
            routeId: r.routeId,
            hops: r.hops,
            poolTypes: r.poolTypes,
            amountIn: amountStr,
            tokenIn: tokenInSymbol,
            amountOut: r.error ? null : r.amountOutFormatted,
            tokenOut: tokenOutSymbol,
            effectivePrice: r.effectivePrice,
            error: r.error ?? null,
          }));

          output(data, headers, rows, jsonMode);
        } else {
          // Single best-route quote
          const amountOut = await mento.quotes.getAmountOut(tokenIn.address, tokenOut.address, amountIn);
          const route = await mento.routes.findRoute(tokenIn.address, tokenOut.address);
          const poolTypes = [...new Set(route.path.map((p) => p.poolType))].join(', ');
          const amountOutFormatted = formatTokenAmount(amountOut, tokenOut.decimals, 6);
          const effectivePrice = calcEffectivePrice(amountIn, amountOut, tokenIn.decimals, tokenOut.decimals);

          if (!jsonMode) {
            console.log(chalk.bold(`\nQuote: ${amountStr} ${tokenInSymbol} → ${tokenOutSymbol}`));
            console.log(chalk.gray(`Route: ${route.id} (${route.path.length} hop(s), ${poolTypes})\n`));
          }

          const headers = ['Token In', 'Amount In', 'Token Out', 'Amount Out', 'Effective Price'];
          const rows = [
            [
              tokenInSymbol,
              amountStr,
              tokenOutSymbol,
              chalk.green(amountOutFormatted),
              effectivePrice,
            ],
          ];
          const data = [
            {
              tokenIn: tokenInSymbol,
              amountIn: amountStr,
              tokenOut: tokenOutSymbol,
              amountOut: amountOutFormatted,
              effectivePrice,
              route: {
                id: route.id,
                hops: route.path.length,
                poolTypes,
              },
            },
          ];

          output(data, headers, rows, jsonMode);
        }
      } catch (err) {
        handleError(err);
      }
    });
}
