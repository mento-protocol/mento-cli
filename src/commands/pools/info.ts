import { Args } from "@oclif/core";
import chalk from "chalk";
import { Contract, ethers } from "ethers";
import { strict as assert } from "node:assert";

import { BIPOOL_MANAGER_ABI } from "../../abis/bipoolmanager-abi";
import { BROKER_ABI } from "../../abis/broker-abi";
import { ERC20_ABI } from "../../abis/erc20-abi";
import { PRICING_MODULE_ABI } from "../../abis/pricingmodule-abi";
import { BaseCommand } from "../../base-command";

interface PoolExchange {
  asset0: string;
  asset1: string;
  bucket0: bigint;
  bucket1: bigint;
  config: {
    minimumReports: bigint;
    referenceRateFeedID: string;
    referenceRateResetFrequency: bigint;
    spread: bigint;
    stablePoolResetSize: bigint;
  };
  lastBucketUpdate: bigint;
  pricingModule: string;
}

export default class PoolsInfo extends BaseCommand<typeof BaseCommand> {
  static args = {
    poolId: Args.string({ description: "The ID of the pool to retrieve information for", required: true }),
  };

  static description = "Get information about a specific pool";

  async run() {
    const { args } = await this.parse(PoolsInfo);
    const provider = this.getProvider();
    const bipoolManagerAddress = this.addresses.BiPoolManager;
    const biPoolManager = new Contract(bipoolManagerAddress, BIPOOL_MANAGER_ABI, provider);
    const brokerAddress = this.addresses.Broker;
    const broker = new Contract(brokerAddress, BROKER_ABI, provider);

    try {
      const poolExchange = await biPoolManager.getPoolExchange(args.poolId);
      await this.displayPoolInfo(poolExchange, broker, args.poolId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.error(`Failed to retrieve pool information: ${errorMessage}`);
    }
  }

  private async displayPoolInfo(poolExchange: PoolExchange, broker: Contract, poolId: string) {
    const { asset0, asset1, bucket0, bucket1, config, lastBucketUpdate, pricingModule } = poolExchange;

    const token0 = new Contract(asset0, ERC20_ABI, this.getProvider());
    const token1 = new Contract(asset1, ERC20_ABI, this.getProvider());
    const pricingModuleContract = new Contract(pricingModule, PRICING_MODULE_ABI, this.getProvider());
    const pricingModuleName = await pricingModuleContract.name();
    const [token0Symbol, token1Symbol] = await Promise.all([token0.symbol(), token1.symbol()]);

    this.log(chalk.bold("\nPool Information:"));
    this.log(`${chalk.cyan("Asset 0:")} ${asset0} (${token0Symbol})`);
    this.log(`${chalk.cyan("Asset 1:")} ${asset1} (${token1Symbol})`);
    this.log(`${chalk.cyan("Pricing Module:")} ${pricingModule} (${pricingModuleName})`);
    this.log(`${chalk.cyan("Bucket 0:")} ${bucket0.toString()}`);
    this.log(`${chalk.cyan("Bucket 1:")} ${bucket1.toString()}`);

    const lastBucketUpdateDate = new Date(Number(lastBucketUpdate) * 1000);
    const formattedDate = lastBucketUpdateDate.toLocaleString("en-US", {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "long",
      second: "2-digit",
      timeZoneName: "short",
      year: "numeric",
    });

    this.log(`${chalk.cyan("Last Bucket Update:")} ${formattedDate}`);

    this.log(chalk.bold("\nPool Configuration:"));
    this.log(`${chalk.cyan("Spread:")} ${config.spread.toString()}`);
    this.log(`${chalk.cyan("Reference Rate Feed ID:")} ${config.referenceRateFeedID}`);
    this.log(`${chalk.cyan("Reference Rate Reset Frequency:")} ${config.referenceRateResetFrequency.toString()}`);
    this.log(`${chalk.cyan("Minimum Reports:")} ${config.minimumReports.toString()}`);
    this.log(`${chalk.cyan("Stable Pool Reset Size:")} ${config.stablePoolResetSize.toString()}`);

    this.log(chalk.bold("\nTrading Limits:"));
    await this.displayTradingLimits(broker, poolId, asset0, asset1);
  }

  private displayProgressBar(label: string, current: number, max: number) {
    const width = 20;
    const percentage = Math.min(Math.max(Math.abs(current) / max, 0), 1);
    const filledWidth = Math.round(width * percentage);
    const emptyWidth = width - filledWidth;

    const bar = `[${"=".repeat(filledWidth)}${" ".repeat(emptyWidth)}]`;
    this.log(
      `${chalk.cyan(label.padEnd(12))} ${bar} ${(percentage * 100).toFixed(2)}% (${this.formatAmount(BigInt(Math.abs(current)))}/${this.formatAmount(
        BigInt(max),
      )})`,
    );
  }

  private async displayTradingLimits(broker: Contract, poolId: string, asset0: string, asset1: string) {
    // Get the limit ids for the assets
    const asset0LimitId = this.getLimitId(poolId, asset0);
    const asset1LimitId = this.getLimitId(poolId, asset1);

    // Get the limit configs for the assets
    const asset0LimitConfig = await broker.tradingLimitsConfig(asset0LimitId);
    const asset1LimitConfig = await broker.tradingLimitsConfig(asset1LimitId);

    // Get the limit states for the assets
    const asset1LimitState = await broker.tradingLimitsState(asset1LimitId);
    const asset0LimitState = await broker.tradingLimitsState(asset0LimitId);

    this.formatAndDisplayLimitConfig("Asset 0", asset0LimitConfig, asset0LimitState);
    this.formatAndDisplayLimitConfig("Asset 1", asset1LimitConfig, asset1LimitState);
  }

  private formatAmount(amount: bigint): string {
    return new Intl.NumberFormat("en-US").format(Number(amount));
  }

  private formatAndDisplayLimitConfig(
    assetLabel: string,
    limitConfig: [bigint, bigint, bigint, bigint, bigint, bigint],
    limitState: [bigint, bigint, bigint, bigint, bigint],
  ) {
    const [timestep0, timestep1, limit0, limit1, limitGlobal, flags] = limitConfig;
    /* eslint-disable-next-line unicorn/no-unreadable-array-destructuring */
    const [, , netflow0, netflow1, netflowGlobal] = limitState;

    this.log(`\n${chalk.bold(assetLabel)} Trading Limits:`);
    this.log(`${chalk.cyan("Time Window 0:")} ${this.formatDuration(timestep0)}`);
    this.log(`${chalk.cyan("Time Window 1:")} ${this.formatDuration(timestep1)}`);

    /* eslint-disable-next-line no-bitwise */
    if ((flags & BigInt(1)) !== BigInt(0)) {
      this.displayProgressBar("Limit 0", Number(netflow0), Number(limit0));
    }

    /* eslint-disable-next-line no-bitwise */
    if ((flags & BigInt(2)) !== BigInt(0)) {
      this.displayProgressBar("Limit 1", Number(netflow1), Number(limit1));
    }

    /* eslint-disable-next-line no-bitwise */
    if ((flags & BigInt(4)) !== BigInt(0)) {
      this.displayProgressBar("Global Limit", Number(netflowGlobal), Number(limitGlobal));
    }

    this.log(`${chalk.cyan("Enabled Limits:")} ${this.formatFlags(Number(flags))}`);
  }

  private formatDuration(seconds: bigint): string {
    const totalSeconds = Number(seconds);
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`);

    return parts.join(", ");
  }

  private formatFlags(flags: number): string {
    const enabledLimits = [];
    /* eslint-disable-next-line no-bitwise */
    if ((flags & 1) !== 0) enabledLimits.push("Limit 0");
    /* eslint-disable-next-line no-bitwise */
    if ((flags & 2) !== 0) enabledLimits.push("Limit 1");
    /* eslint-disable-next-line no-bitwise */
    if ((flags & 4) !== 0) enabledLimits.push("Global Limit");
    return enabledLimits.join(", ") || "None";
  }

  private getLimitId(poolId: string, asset: string): string {
    const assetBytes32 = ethers.zeroPadValue(asset, 32);
    const exchangeIdBytes = ethers.getBytes(poolId);
    const assetBytes = ethers.getBytes(assetBytes32);
    assert(exchangeIdBytes.length === assetBytes.length, "exchangeId and asset0 must be the same length");

    /* eslint-disable no-bitwise */
    const xorResult = Uint8Array.from(exchangeIdBytes.map((b, i) => b ^ assetBytes[i]));
    return ethers.hexlify(xorResult);
  }
}
