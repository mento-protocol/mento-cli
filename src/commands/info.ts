import { Command } from 'commander';
import chalk from 'chalk';
import { getMento, resolveChainId, type GlobalOptions } from '../lib/client.js';
import { formatAddress, createTable, output } from '../lib/format.js';
import { handleError } from '../lib/errors.js';
import { addresses, type ContractAddresses } from '@mento-protocol/mento-sdk';

const CHAIN_NAMES: Record<number, string> = {
  42220: 'Celo Mainnet',
  11142220: 'Celo Sepolia',
};

export function registerInfoCommand(program: Command): void {
  program
    .command('info')
    .description('Show protocol overview and contract addresses')
    .option('--contracts', 'List all known contract addresses')
    .addHelpText('after', `
Examples:
  $ mento info                Show protocol overview (pools, routes, tokens)
  $ mento info --contracts    List all known contract addresses
  $ mento info --json         Output as JSON
  $ mento info --chain celo-sepolia  Show info for Celo Sepolia testnet
`)
    .action(async (options: { contracts?: boolean }) => {
      const globalOpts = program.opts<GlobalOptions>();

      try {
        const chainId = resolveChainId(globalOpts.chain);
        const mento = await getMento(globalOpts);
        const jsonMode = globalOpts.json ?? false;

        if (options.contracts) {
          await showContracts(chainId, jsonMode);
        } else {
          await showInfo(mento, chainId, jsonMode);
        }
      } catch (err) {
        handleError(err);
      }
    });
}

async function showInfo(
  mento: Awaited<ReturnType<typeof getMento>>,
  chainId: number,
  jsonMode: boolean
): Promise<void> {
  const chainName = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

  // Gather counts in parallel
  const [pools, routes, stableTokens, collateralAssets] = await Promise.all([
    mento.pools.getPools(),
    mento.routes.getRoutes(),
    mento.tokens.getStableTokens(),
    mento.tokens.getCollateralAssets(),
  ]);

  const totalTokens = stableTokens.length + collateralAssets.length;

  // Get key contract addresses
  const chainAddresses = addresses[chainId as keyof typeof addresses] as ContractAddresses | undefined;
  const routerAddr = chainAddresses?.MentoRouter ?? chainAddresses?.Router ?? 'N/A';
  const fpmmFactoryAddr = chainAddresses?.FPMMFactory ?? 'N/A';
  const virtualPoolFactoryAddr = chainAddresses?.VirtualPoolFactory ?? 'N/A';
  const brokerAddr = chainAddresses?.Broker ?? 'N/A';

  if (jsonMode) {
    console.log(JSON.stringify({
      chain: { name: chainName, id: chainId },
      contracts: {
        MentoRouter: routerAddr,
        FPMMFactory: fpmmFactoryAddr,
        VirtualPoolFactory: virtualPoolFactoryAddr,
        Broker: brokerAddr,
      },
      counts: {
        pools: pools.length,
        routes: routes.length,
        tokens: totalTokens,
        stableTokens: stableTokens.length,
        collateralAssets: collateralAssets.length,
      },
    }, null, 2));
    return;
  }

  console.log(chalk.bold('Mento Protocol Info'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`${chalk.cyan('Chain:')}          ${chainName} (${chainId})`);
  console.log(`${chalk.cyan('MentoRouter:')}    ${routerAddr !== 'N/A' ? formatAddress(routerAddr) : chalk.gray('N/A')}`);
  console.log(`${chalk.cyan('FPMMFactory:')}    ${fpmmFactoryAddr !== 'N/A' ? formatAddress(fpmmFactoryAddr) : chalk.gray('N/A')}`);
  console.log(`${chalk.cyan('VirtualFactory:')} ${virtualPoolFactoryAddr !== 'N/A' ? formatAddress(virtualPoolFactoryAddr) : chalk.gray('N/A')}`);
  console.log(`${chalk.cyan('Broker:')}         ${brokerAddr !== 'N/A' ? formatAddress(brokerAddr) : chalk.gray('N/A')}`);
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`${chalk.cyan('Total Pools:')}    ${chalk.white(String(pools.length))}`);
  console.log(`${chalk.cyan('Total Routes:')}   ${chalk.white(String(routes.length))}`);
  console.log(`${chalk.cyan('Total Tokens:')}   ${chalk.white(String(totalTokens))} (${stableTokens.length} stable, ${collateralAssets.length} collateral)`);
}

async function showContracts(chainId: number, jsonMode: boolean): Promise<void> {
  const chainName = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
  const chainAddresses = addresses[chainId as keyof typeof addresses] as ContractAddresses | undefined;

  if (!chainAddresses) {
    console.error(chalk.red(`No contract addresses found for chain ${chainId}`));
    process.exit(1);
  }

  const entries = Object.entries(chainAddresses).filter(([, v]) => v !== undefined) as [string, string][];

  if (jsonMode) {
    const data: Record<string, string> = {};
    for (const [k, v] of entries) {
      data[k] = v;
    }
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(chalk.bold(`Contract Addresses — ${chainName}`));
  console.log(chalk.gray(`Found ${entries.length} contract(s)\n`));

  const headers = ['Contract', 'Address'];
  const rows = entries.map(([name, addr]) => [chalk.cyan(name), addr]);

  const tableData = entries.map(([name, addr]) => ({ contract: name, address: addr }));
  output(tableData, headers, rows, jsonMode);
}
