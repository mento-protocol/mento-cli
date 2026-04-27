# mento-cli

> CLI for the Mento Protocol — onchain FX infrastructure

A command-line interface that wraps [@mento-protocol/mento-sdk](https://github.com/mento-protocol/mento-sdk) v3, bringing the full power of Mento's onchain FX protocol to your terminal. Inspect tokens, discover routes, get quotes, and execute swaps — all without leaving the command line.

## Overview

**mento-cli** is a structured, ergonomic CLI built on Commander.js. It connects directly to the Celo blockchain (or any supported chain) via the Mento SDK, giving you real-time access to:

- Protocol tokens and their on-chain supply
- Trading routes between token pairs
- Liquidity pool details and configuration
- Live swap quotes with multi-route comparison
- On-chain token swaps with slippage controls
- Trading status and circuit-breaker limits
- Protocol metadata and contract addresses

## Installation

```bash
# Install globally
npm install -g @mento-protocol/cli

# Or run directly without installing
npx @mento-protocol/cli
```

The package name is `@mento-protocol/cli`; the installed binary is `mento`.

### Installing from source

```bash
git clone https://github.com/mento-protocol/mento-cli.git
cd mento-cli
npm install
npm pack
npm install -g ./mento-protocol-cli-*.tgz
```

Use `npm pack` rather than `npm install -g .` — Volta and some npm setups produce a broken symlink when linking a local package directly.

Requires **Node.js >= 18**.

## Quick Start

```bash
# Show all Mento stable tokens
mento tokens

# Discover available trading routes
mento routes

# Get a quote for swapping 100 USDm to USDC
mento quote USDm USDC 100

# Show protocol overview
mento info
```

## Commands

### `mento tokens`

List tokens known to the Mento Protocol.

```bash
mento tokens                # List stable tokens (default)
mento tokens --collateral   # List collateral assets
mento tokens --all          # List both stable and collateral tokens
mento tokens --json         # Output as JSON
```

| Flag | Description |
|---|---|
| `--collateral` | Show collateral assets instead of stable tokens |
| `--all` | Show all tokens (stable + collateral) |

---

### `mento routes`

Discover trading routes between token pairs.

```bash
mento routes                        # List all available routes
mento routes --from USDm --to USDC  # Filter routes by token pair
mento routes --direct               # Show only direct (single-hop) routes
mento routes --fresh                # Bypass cache, fetch live from chain
mento routes --graph                # Show route graph visualization
```

| Flag | Description |
|---|---|
| `--direct` | Show only direct routes (no multi-hop) |
| `--from <token>` | Filter by source token symbol |
| `--to <token>` | Filter by destination token symbol |
| `--fresh` | Skip cache and fetch routes from chain |
| `--graph` | Display an ASCII route graph |

---

### `mento pools`

Inspect liquidity pools and their configuration.

```bash
mento pools                        # List all pools
mento pools --type VirtualPool     # Filter by pool type
mento pools --details <address>    # Show detailed info for a specific pool
mento pools --json                 # Output as JSON
```

| Flag | Description |
|---|---|
| `--type <type>` | Filter pools by type (e.g., `VirtualPool`) |
| `--details <address>` | Show detailed configuration for a pool |

---

### `mento quote`

Get swap quotes for a token pair and amount.

```bash
mento quote USDm USDC 100               # Quote 100 USDm → USDC
mento quote USDC USDm 50                # Quote 50 USDC → USDm
mento quote USDm USDC 100 --all-routes  # Compare quotes across all routes
mento quote USDm USDC 100 --json        # Output as JSON
```

**Positional arguments:** `<from> <to> <amount>`

| Flag | Description |
|---|---|
| `--all-routes` | Show quotes from all available routes for comparison |

---

### `mento swap`

Execute a token swap on-chain.

```bash
mento swap USDm USDC 100 --private-key 0x...   # Swap with inline key
mento swap USDm USDC 100 --keyfile ./key.txt    # Swap with keyfile
mento swap USDm USDC 100 --dry-run              # Preview without sending tx
mento swap USDm USDC 100 --slippage 1 --yes     # 1% slippage, skip prompt
```

**Positional arguments:** `<from> <to> <amount>`

| Flag | Description | Default |
|---|---|---|
| `--private-key <key>` | Private key for transaction signing | — |
| `--keyfile <path>` | Path to file containing private key | — |
| `--slippage <percent>` | Maximum slippage tolerance (%) | `0.5` |
| `--deadline <minutes>` | Transaction deadline in minutes | `5` |
| `--dry-run` | Output CallParams as JSON without sending | — |
| `-y, --yes` | Skip the confirmation prompt | — |

---

### `mento trading`

Check trading status and limits.

```bash
mento trading status                # Check trading status for all routes
mento trading status USDm USDC     # Check if a specific pair is tradable
mento trading limits               # Show trading limits for all pools
mento trading limits --json        # Output limits as JSON
```

**Subcommands:** `status`, `limits`

---

### `mento info`

Show protocol overview and contract addresses.

```bash
mento info                          # Protocol overview (pools, routes, tokens)
mento info --contracts              # List all known contract addresses
mento info --chain celo-sepolia     # Show info for testnet
mento info --json                   # Output as JSON
```

| Flag | Description |
|---|---|
| `--contracts` | List all known Mento contract addresses |

---

### `mento cache`

Refresh cached protocol data from the blockchain.

```bash
mento cache routes    # Refresh the routes cache
mento cache tokens    # Refresh the tokens cache
```

**Subcommands:** `routes`, `tokens`

## Global Options

These flags can be used with any command:

| Option | Description | Default |
|---|---|---|
| `-c, --chain <name-or-id>` | Chain name (`celo`, `celo-sepolia`) or numeric chain ID | `celo` |
| `--rpc <url>` | Custom RPC endpoint URL | Chain default |
| `--json` | Output as JSON instead of formatted tables | `false` |
| `-V, --version` | Print version | — |
| `-h, --help` | Show help for a command | — |

## Multi-Chain Support

mento-cli supports multiple chains via the `--chain` flag. Pass a chain name or numeric chain ID:

```bash
# Celo mainnet (default)
mento tokens

# Celo Sepolia testnet
mento tokens --chain celo-sepolia

# By chain ID
mento tokens --chain 44787

# With a custom RPC endpoint
mento info --chain celo --rpc https://my-rpc.example.com
```

The chain registry maps chain names to their chain IDs and default RPC endpoints. The SDK handles chain-specific contract addresses automatically.

## Examples

```bash
# Full workflow: inspect → quote → swap
mento tokens --all
mento routes --from USDm --to USDC
mento quote USDm USDC 100
mento swap USDm USDC 100 --private-key 0x... --slippage 0.5

# Pipe JSON output to jq for scripting
mento tokens --json | jq '.[] | .symbol'
mento quote USDm USDC 100 --json | jq '.amountOut'

# Check if trading is active before swapping
mento trading status USDm USDC

# Refresh cached data if results seem stale
mento cache routes
mento cache tokens
```

## Links

- **SDK**: [github.com/mento-protocol/mento-sdk](https://github.com/mento-protocol/mento-sdk)
- **Protocol**: [mento.org](https://mento.org)

## License

MIT
