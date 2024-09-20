import * as fs from "node:fs";
import * as path from "node:path";

import { BaseCommand } from "../../base-command";

export default class GetConfig extends BaseCommand<typeof BaseCommand> {
  static description = "Get configuration options for the CLI";

  async run() {
    const { configDir } = this.config;
    const configPath = path.join(configDir, "config.json");

    if (!fs.existsSync(configPath)) {
      this.log("No configuration found.");
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    this.log(config);
  }
}
