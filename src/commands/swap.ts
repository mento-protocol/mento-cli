import { Command } from 'commander';
import chalk from 'chalk';
import { getMento, resolveChainId, type GlobalOptions } from '../lib/client.js';
import { formatTokenAmount } from '../lib/format.js';
import { resolveToken } from '../lib/utils.js';
import { handleError } from '../lib/errors.js';
import { createWallet, type WalletOptions } from '../lib/wallet.js';
import { deadlineFromMinutes, type CallParams, type SwapTransaction } from '@mento-protocol/mento-sdk';

interface SwapCommandOptions extends WalletOptions {
  slippage: string;
  deadline: string;
  dryRun?: boolean;
  yes?: boolean;
}

function parseAmount(amountStr: string, decimals: number): bigint {
  const [intPart, fracPart = ''] = amountStr.split('.');
  const paddedFrac = fracPart.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(intPart) * BigInt(10 ** decimals) + BigInt(paddedFrac);
}

function callParamsToJson(params: CallParams): Record<string, string> {
  return {
    to: params.to,
    data: params.data,
    value: params.value,
  };
}

async function promptConfirmation(message: string): Promise<boolean> {
  const readline = await import('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export function registerSwapCommand(program: Command): void {
  program
    .command('swap <tokenIn> <tokenOut> <amount>')
    .description('Execute a token swap on the Mento Protocol')
    .option('--private-key <key>', 'Private key for signing transactions')
    .option('--keyfile <path>', 'Path to file containing private key')
    .option('--slippage <percent>', 'Slippage tolerance in percent', '0.5')
    .option('--deadline <minutes>', 'Transaction deadline in minutes', '5')
    .option('--dry-run', 'Output transaction CallParams as JSON without sending')
    .option('-y, --yes', 'Skip confirmation prompt')
    .addHelpText('after', `
Examples:
  $ mento swap USDm CELO 100 --private-key 0x...   Swap 100 USDm for CELO
  $ mento swap USDm CELO 100 --keyfile ./key.txt    Swap using a keyfile
  $ mento swap USDm CELO 100 --dry-run              Preview swap without sending
  $ mento swap USDm CELO 100 --slippage 1 --yes     Swap with 1% slippage, skip prompt
  $ mento swap CELO USDm 50 --private-key 0x... --json
`)
    .action(async (tokenInSymbol: string, tokenOutSymbol: string, amountStr: string, options: SwapCommandOptions) => {
      const globalOpts = program.opts<GlobalOptions>();

      try {
        const chainId = resolveChainId(globalOpts.chain);
        const mento = await getMento(globalOpts);
        const jsonMode = globalOpts.json ?? false;

        // Resolve tokens
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

        // Parse swap parameters
        const amountIn = parseAmount(amountStr, tokenIn.decimals);
        const slippage = parseFloat(options.slippage);
        const deadlineMinutes = parseFloat(options.deadline);

        if (isNaN(slippage) || slippage < 0) {
          console.error(chalk.red('Error: Invalid slippage value.'));
          process.exit(1);
        }
        if (isNaN(deadlineMinutes) || deadlineMinutes <= 0) {
          console.error(chalk.red('Error: Invalid deadline value.'));
          process.exit(1);
        }

        // Create wallet (validates private key early, even for dry-run)
        const isDryRun = options.dryRun ?? false;

        let account: ReturnType<typeof createWallet>['account'] | undefined;
        let walletClient: ReturnType<typeof createWallet>['walletClient'] | undefined;

        if (!isDryRun) {
          const wallet = createWallet(chainId, options, globalOpts.rpc);
          account = wallet.account;
          walletClient = wallet.walletClient;
        }

        // For dry-run we still need an address for the owner/recipient params
        // Use a zero address placeholder if no wallet
        const ownerAddress = account?.address ?? '0x0000000000000000000000000000000000000001';

        // Find route
        const route = await mento.routes.findRoute(tokenIn.address, tokenOut.address);

        // Get quote
        const expectedAmountOut = await mento.quotes.getAmountOut(
          tokenIn.address,
          tokenOut.address,
          amountIn,
          route,
        );

        // Build swap transaction
        const deadline = deadlineFromMinutes(deadlineMinutes);
        const swapTx: SwapTransaction = await mento.swap.buildSwapTransaction(
          tokenIn.address,
          tokenOut.address,
          amountIn,
          ownerAddress,
          ownerAddress,
          { slippageTolerance: slippage, deadline },
          route,
        );

        const amountInFormatted = formatTokenAmount(amountIn, tokenIn.decimals, 6);
        const amountOutFormatted = formatTokenAmount(expectedAmountOut, tokenOut.decimals, 6);
        const amountOutMinFormatted = formatTokenAmount(
          swapTx.swap.amountOutMin,
          tokenOut.decimals,
          6,
        );

        // Dry-run mode: output CallParams JSON and exit
        if (isDryRun) {
          const dryRunOutput: Record<string, unknown> = {
            swap: callParamsToJson(swapTx.swap.params),
            approval: swapTx.approval ? callParamsToJson(swapTx.approval) : null,
            details: {
              tokenIn: tokenIn.symbol,
              tokenOut: tokenOut.symbol,
              amountIn: amountInFormatted,
              expectedAmountOut: amountOutFormatted,
              minimumAmountOut: amountOutMinFormatted,
              slippage: `${slippage}%`,
              deadline: deadline.toString(),
              route: route.id,
            },
          };

          console.log(JSON.stringify(dryRunOutput, null, 2));
          return;
        }

        // Display confirmation
        if (!jsonMode) {
          console.log(chalk.bold('\nSwap Details'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(`${chalk.cyan('From:')}      ${amountInFormatted} ${tokenIn.symbol}`);
          console.log(`${chalk.cyan('To:')}        ${amountOutFormatted} ${tokenOut.symbol} (expected)`);
          console.log(`${chalk.cyan('Min Out:')}   ${amountOutMinFormatted} ${tokenOut.symbol}`);
          console.log(`${chalk.cyan('Slippage:')}  ${slippage}%`);
          console.log(`${chalk.cyan('Route:')}     ${route.id}`);
          console.log(`${chalk.cyan('Sender:')}    ${account!.address}`);
          if (swapTx.approval) {
            console.log(`${chalk.cyan('Approval:')} Required`);
          }
          console.log(chalk.gray('─'.repeat(50)));
        }

        // Prompt for confirmation unless --yes
        if (!options.yes) {
          const confirmed = await promptConfirmation(
            chalk.yellow('\nProceed with swap? (y/N) '),
          );
          if (!confirmed) {
            console.log(chalk.gray('Swap cancelled.'));
            return;
          }
        }

        // Send approval transaction if needed
        if (swapTx.approval) {
          if (!jsonMode) {
            console.log(chalk.gray('\nSending approval transaction...'));
          }

          const approvalHash = await walletClient!.sendTransaction({
            to: swapTx.approval.to as `0x${string}`,
            data: swapTx.approval.data as `0x${string}`,
            value: BigInt(swapTx.approval.value),
            account: account!,
            chain: walletClient!.chain,
          });

          if (!jsonMode) {
            console.log(chalk.green(`Approval tx: ${approvalHash}`));
          }
        }

        // Send swap transaction
        if (!jsonMode) {
          console.log(chalk.gray('Sending swap transaction...'));
        }

        const swapHash = await walletClient!.sendTransaction({
          to: swapTx.swap.params.to as `0x${string}`,
          data: swapTx.swap.params.data as `0x${string}`,
          value: BigInt(swapTx.swap.params.value),
          account: account!,
          chain: walletClient!.chain,
        });

        // Output result
        if (jsonMode) {
          const result: Record<string, unknown> = {
            status: 'submitted',
            swapTxHash: swapHash,
            tokenIn: tokenIn.symbol,
            tokenOut: tokenOut.symbol,
            amountIn: amountInFormatted,
            expectedAmountOut: amountOutFormatted,
            minimumAmountOut: amountOutMinFormatted,
            slippage: `${slippage}%`,
            route: route.id,
            sender: account!.address,
          };
          if (swapTx.approval) {
            result.approvalTxHash = 'included';
          }
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.green(`\nSwap transaction submitted!`));
          console.log(`${chalk.cyan('Tx Hash:')} ${swapHash}`);
          console.log(
            chalk.gray(
              `\nSwapped ${amountInFormatted} ${tokenIn.symbol} → ~${amountOutFormatted} ${tokenOut.symbol}`,
            ),
          );
        }
      } catch (err) {
        handleError(err);
      }
    });
}
