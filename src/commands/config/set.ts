import { Flags } from "@oclif/core";
import * as fs from "node:fs";
import * as path from "node:path";

import { BaseCommand } from "../../base-command";

export default class SetConfig extends BaseCommand<typeof BaseCommand> {
  static description = "Set configuration options for the CLI";

  static flags = {
    rpcUrl: Flags.string({
      char: "r",
      description: "Specify the RPC URL to use",
      required: true,
    }),
  };

  async run() {
    const { flags } = await this.parse(SetConfig);

    const { configDir } = this.config;
    const configPath = path.join(configDir, "config.json");

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const config = {
      rpcUrl: flags.rpcUrl,
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    this.log(`RPC URL set to ${flags.rpcUrl}`);

    await this.setRpcUrl(flags.rpcUrl);
  }
}
