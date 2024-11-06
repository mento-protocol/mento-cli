import * as mento from "@mento-protocol/mento-sdk";
import { ContractAddresses } from "@mento-protocol/mento-sdk";
import { Command, Flags, Interfaces } from "@oclif/core";
import { JsonRpcProvider } from "ethers";
import * as fs from "node:fs";
import * as path from "node:path";

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)["baseFlags"] & T["flags"]>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

export abstract class BaseCommand<T extends typeof Command> extends Command {
  protected addresses!: ContractAddresses;
  protected args!: Args<T>;
  protected flags!: Flags<T>;
  protected rpcUrl!: string;
  private DEFAULT_RPC_URL = "https://forno.celo.org";

  private provider!: JsonRpcProvider;

  protected async catch(err: { exitCode?: number } & Error): Promise<unknown> {
    return super.catch(err);
  }

  protected async finally(_: Error | undefined): Promise<unknown> {
    return super.finally(_);
  }

  protected getProvider(): JsonRpcProvider {
    return this.provider;
  }

  public async init(): Promise<void> {
    await super.init();
    const { args, flags } = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    });
    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;

    const configPath = path.join(this.config.configDir, "config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      this.rpcUrl = config.rpcUrl || this.DEFAULT_RPC_URL;
    } else {
      this.rpcUrl = this.DEFAULT_RPC_URL;
    }

    // Initialize the provider
    this.provider = new JsonRpcProvider(this.rpcUrl);

    // Fetch chain ID and addresses
    await this.updateAddresses();
  }

  public async setRpcUrl(newRpcUrl: string): Promise<void> {
    this.rpcUrl = newRpcUrl;
    // Update the provider with the new RPC URL
    this.provider = new JsonRpcProvider(this.rpcUrl);
    await this.updateAddresses();
  }

  protected async updateAddresses(): Promise<void> {
    const network = await this.provider.getNetwork();

    const { chainId } = network;
    this.addresses = mento.addresses[Number(chainId)];
    if (!this.addresses) {
      this.error(`No addresses found for chain ID: ${chainId}`);
    }
  }
}
