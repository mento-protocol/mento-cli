# mento-cli

CLI for interacting with the Mento protocol

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/mento-cli.svg)](https://npmjs.org/package/mento-cli)
[![Downloads/week](https://img.shields.io/npm/dw/mento-cli.svg)](https://npmjs.org/package/mento-cli)

## 📋 Table of Contents

1. 🔨 [Getting Started](#getting-started)

2. 🚀 [Usage](#usage)

3. ✨ [Misc commands](#commands)

4. ©️ [License](#license)

## <a name="getting-started">🔨 Getting Started</a>

To get started working on this, you will need to have the following on your machine :

![PNPM](https://img.shields.io/badge/-pnpm-green?style=for-the-badge&logoColor=white&logo=pnpm)

![Typescript](https://img.shields.io/badge/-typescript-blue?style=for-the-badge&logoColor=white&logo=typescript)

Then, run the following commands to build and use the cli locally:

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run CLI locally
pnpm run dev
```

## <a name="usage">🚀 Usage</a>

An NPM package for the CLI does not yet exist, at this time the easiest way to get started is to create a global alias:

```bash
# Ensure the app is built
pnpm run build

# At the project root run this command to crete a global CLI alias
pnpm link --global

# Now you can run anywhere using
mento
```

## <a name="commands">✨ Commands</a>

- [`mento pools list`](#mento-pools-list)
- [`mento pools info POOLID`](#mento-pools-info-poolid)
- [`mento config COMMAND`](#mento-config-command)
- [`mento config set FLAG`](#mento-config-set-flag)

## `mento pools list`

### List all pools with their basic information

```
USAGE
  $ mento pools list [-p]

FLAGS
  -p, --pretty  Format output in a table and which includes token addresses.

EXAMPLES
  List all pools.

    $ mento pools list

  List all pools in an ugly tabe. Only looks pretty with a full screen terminal.

    $ mento pools list -p
```

## `mento pools info POOLID`

### Get information about a specific pool

```
USAGE
  $ mento pools info POOLID

ARGUMENTS
  POOLID  ID of pool to be retrieved

EXAMPLES
  Get information for the cUSD/CELO pool on mainnet.

    $ mento pools info 0x3135b662c38265d0655177091f1b647b4fef511103d06c016efdf18b46930d2c
```

## `mento config COMMAND`

### Get/set the configuration options for the CLI

```
USAGE
  $ mento config COMMAND

COMMANDS
  config get  Get configuration options for the CLI
  config set  Set configuration options for the CLI

EXAMPLES

  Get the configurable options
    $ mento config get

  Set a configurable options
    $ mento config set FLAG
```

## `mento config set FLAG`

### Set the value for the configuration option with the given flag

```
USAGE
  $ mento config set -r <value>

FLAGS
  -r, --rpcUrl=<value>  (required) Specify the RPC URL to use

EXAMPLES

  Set the rpc url to use for the cli.
    $ mento config get set -r https://alfajores-forno.celo-testnet.org
```

## <a name="license">©️ License</a>

This project is licensed under the [MIT License](http://opensource.org/licenses/MIT).

If you want to contribute to this project, please read the [**contribution guide**](/CONTRIBUTING.MD)
