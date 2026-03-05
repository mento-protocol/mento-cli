import { Command } from 'commander';
import chalk from 'chalk';
import { getMento, resolveChainId, type GlobalOptions } from '../lib/client.js';
import { output } from '../lib/format.js';
import { resolveToken } from '../lib/utils.js';
import { handleError } from '../lib/errors.js';
import type { Route, RouteWithCost } from '@mento-protocol/mento-sdk';

interface RoutesOptions {
  direct?: boolean;
  from?: string;
  to?: string;
  fresh?: boolean;
  graph?: boolean;
}

function routeToRow(route: Route | RouteWithCost): string[] {
  const poolTypes = [...new Set(route.path.map((p) => p.poolType))].join(', ');
  return [
    route.id,
    route.tokens[0].symbol,
    route.tokens[1].symbol,
    String(route.path.length),
    poolTypes,
  ];
}

function routeToData(route: Route | RouteWithCost): Record<string, unknown> {
  return {
    id: route.id,
    tokenA: route.tokens[0],
    tokenB: route.tokens[1],
    hops: route.path.length,
    poolTypes: route.path.map((p) => p.poolType),
    path: route.path.map((p) => ({ poolAddr: p.poolAddr, poolType: p.poolType })),
  };
}

/**
 * Resolve the symbol for a token address using the chain's token registry.
 * Falls back to an abbreviated address if the token is not found.
 */
function symbolForAddress(chainId: number, address: string): string {
  const token = resolveToken(chainId, address);
  return token ? token.symbol : `${address.slice(0, 6)}...`;
}

/**
 * Build a list of edges (symbol pairs) for a route.
 * Direct routes produce one edge; multi-hop routes produce edges through
 * intermediate tokens.
 */
function routeToEdges(
  route: Route | RouteWithCost,
  chainId: number,
): Array<[string, string]> {
  const edges: Array<[string, string]> = [];

  if (route.path.length === 1) {
    // Direct route – single edge between the two endpoint tokens
    edges.push([route.tokens[0].symbol, route.tokens[1].symbol]);
  } else {
    // Multi-hop: walk through pools to discover intermediate tokens
    const endpointA = route.tokens[0].symbol;
    const endpointB = route.tokens[1].symbol;

    // Determine order by finding which endpoint is in the first pool
    const firstPool = route.path[0];
    const firstPoolTokens = [
      firstPool.token0.toLowerCase(),
      firstPool.token1.toLowerCase(),
    ];

    // Start from the endpoint that appears in the first pool
    let currentAddr: string;
    if (firstPoolTokens.includes(route.tokens[0].address.toLowerCase())) {
      currentAddr = route.tokens[0].address.toLowerCase();
    } else {
      currentAddr = route.tokens[1].address.toLowerCase();
    }

    let currentSymbol =
      currentAddr === route.tokens[0].address.toLowerCase()
        ? endpointA
        : endpointB;

    for (const pool of route.path) {
      const poolToken0 = pool.token0.toLowerCase();
      const poolToken1 = pool.token1.toLowerCase();

      // The next token in the hop is the one in this pool that isn't the current token
      const nextAddr =
        poolToken0 === currentAddr ? poolToken1 : poolToken0;
      const nextSymbol = symbolForAddress(chainId, nextAddr);

      edges.push([currentSymbol, nextSymbol]);

      currentAddr = nextAddr;
      currentSymbol = nextSymbol;
    }
  }

  return edges;
}

/**
 * Generate a Mermaid flowchart diagram string from a list of routes.
 */
function buildMermaidGraph(
  routes: Array<Route | RouteWithCost>,
  chainId: number,
): string {
  const edgeSet = new Set<string>();
  const lines: string[] = ['graph LR'];

  for (const route of routes) {
    const edges = routeToEdges(route, chainId);
    for (const [a, b] of edges) {
      // Normalise edge key so A---B and B---A are deduplicated
      const key = [a, b].sort().join('---');
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        const [left, right] = [a, b].sort();
        lines.push(`  ${left} --- ${right}`);
      }
    }
  }

  return lines.join('\n');
}

export function registerRoutesCommand(program: Command): void {
  program
    .command('routes')
    .description('List trading routes in the Mento Protocol')
    .option('-d, --direct', 'Only show direct (single-hop) routes')
    .option('--from <symbol>', 'Find route from this token symbol')
    .option('--to <symbol>', 'Find route to this token symbol')
    .option('--fresh', 'Bypass cache and fetch fresh routes from the blockchain')
    .option('-g, --graph', 'Output a Mermaid flowchart diagram of token connectivity')
    .addHelpText('after', `
Examples:
  $ mento routes                        List all routes (direct + multi-hop)
  $ mento routes --direct               List direct (single-hop) routes only
  $ mento routes --from USDm --to CELO  Find a specific route between two tokens
  $ mento routes --graph                Output a Mermaid flowchart diagram
  $ mento routes --fresh                Bypass cache, fetch fresh from chain
`)
    .action(async (options: RoutesOptions) => {
      const globalOpts = program.opts<GlobalOptions>();

      try {
        const mento = await getMento(globalOpts);
        const jsonMode = globalOpts.json ?? false;
        const chainId = resolveChainId(globalOpts.chain);

        // --graph: output Mermaid flowchart and exit
        if (options.graph) {
          const routes = await mento.routes.getRoutes({ cached: !options.fresh });
          const mermaid = buildMermaidGraph([...routes], chainId);
          console.log(mermaid);
          return;
        }

        const headers = ['Route ID', 'Token A', 'Token B', 'Hops', 'Pool Types'];

        if (options.from || options.to) {
          // Find specific route between two tokens
          if (!options.from || !options.to) {
            console.error(chalk.red('Error: --from and --to must be used together'));
            process.exit(1);
          }

          const tokenIn = resolveToken(chainId, options.from);
          const tokenOut = resolveToken(chainId, options.to);

          if (!tokenIn) {
            console.error(chalk.red(`Error: Token not found: ${options.from}`));
            process.exit(1);
          }
          if (!tokenOut) {
            console.error(chalk.red(`Error: Token not found: ${options.to}`));
            process.exit(1);
          }

          const route = await mento.routes.findRoute(tokenIn.address, tokenOut.address, {
            cached: !options.fresh,
          });

          if (!jsonMode) {
            console.log(chalk.bold(`Route: ${route.id}`));
            console.log(chalk.gray(`Hops: ${route.path.length}\n`));
          }

          output([routeToData(route)], headers, [routeToRow(route)], jsonMode);
        } else if (options.direct) {
          // Direct (single-hop) routes only
          const routes = await mento.routes.getDirectRoutes();

          if (!jsonMode) {
            console.log(chalk.bold('Direct Routes'));
            console.log(chalk.gray(`Found ${routes.length} direct route(s)\n`));
          }

          const rows = routes.map(routeToRow);
          const data = routes.map(routeToData);
          output(data, headers, rows, jsonMode);
        } else {
          // All routes (direct + multi-hop)
          const routes = await mento.routes.getRoutes({ cached: !options.fresh });

          if (!jsonMode) {
            console.log(chalk.bold('All Routes'));
            console.log(chalk.gray(`Found ${routes.length} route(s)\n`));
          }

          const rows = [...routes].map(routeToRow);
          const data = [...routes].map(routeToData);
          output(data, headers, rows, jsonMode);
        }
      } catch (err) {
        handleError(err);
      }
    });
}
