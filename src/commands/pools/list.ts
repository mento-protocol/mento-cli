import { Flags } from "@oclif/core";
import chalk from "chalk";
import { Contract } from "ethers";
import Table from "tty-table";

import { BIPOOL_MANAGER_ABI } from "../../abis/bipoolmanager-abi";
import { ERC20_ABI } from "../../abis/erc20-abi";
import { BaseCommand } from "../../base-command";

export default class PoolsList extends BaseCommand<typeof BaseCommand> {
  static description = "List all pools with their basic information";

  static flags = {
    ...BaseCommand.flags,
    pretty: Flags.boolean({ char: "p", description: "Display output in a pretty table format" }),
  };

  async run() {
    const { flags } = await this.parse(PoolsList);
    const provider = this.getProvider();
    const bipoolManagerAddress = this.addresses.BiPoolManager;
    const biPoolManager = new Contract(bipoolManagerAddress, BIPOOL_MANAGER_ABI, provider);

    const exchanges = await biPoolManager.getExchanges();

    const tokenInfoPromises = exchanges.flatMap(([, [token0Address, token1Address]]: [unknown, [string, string]]) => {
      const token0 = new Contract(token0Address, ERC20_ABI, provider);
      const token1 = new Contract(token1Address, ERC20_ABI, provider);
      return [token0.name(), token0.symbol(), token1.name(), token1.symbol()];
    });

    const tokenInfo = await Promise.all(tokenInfoPromises);

    if (flags.pretty) {
      this.renderPrettyTable(exchanges, tokenInfo);
    } else {
      this.renderSimpleList(exchanges, tokenInfo);
    }
  }

  private renderPrettyTable(exchanges: [string, [string, string]][], tokenInfo: string[]) {
    const header = [
      { value: "Pool ID", width: 66 },
      { value: "Token 0", width: 52 },
      { value: "Token 1", width: 52 },
    ];

    const rows = [];

    for (const [i, [poolId, [token0Address, token1Address]]] of exchanges.entries()) {
      const [token0Name, token0Symbol, token1Name, token1Symbol] = tokenInfo.slice(i * 4, (i + 1) * 4);

      rows.push([
        `${chalk.cyan(poolId)} ${chalk.yellow(`(${token0Symbol}/${token1Symbol})`)}`,
        `${chalk.green(token0Symbol)} (${token0Name})\n${chalk.dim(token0Address)}`,
        `${chalk.green(token1Symbol)} (${token1Name})\n${chalk.dim(token1Address)}`,
      ]);
    }

    const options = {
      borderStyle: "solid",
      paddingLeft: 1,
      paddingRight: 1,
    };

    // eslint-disable-next-line new-cap
    const table = Table(header, rows, [], options);

    this.log(table.render());
  }

  private renderSimpleList(exchanges: [string, [string, string]][], tokenInfo: string[]) {
    for (const [i, [poolId]] of exchanges.entries()) {
      const [, token0Symbol, , token1Symbol] = tokenInfo.slice(i * 4, (i + 1) * 4);
      this.log(`${chalk.white(poolId)} - ${chalk.green(token0Symbol)}/${chalk.green(token1Symbol)}`);
    }
  }
}
