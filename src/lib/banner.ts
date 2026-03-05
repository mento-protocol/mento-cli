import chalk from 'chalk';

// Mento brand colors
const purple = chalk.hex('#7C3AED');
const lightPurple = chalk.hex('#A78BFA');
const darkPurple = chalk.hex('#4C1D95');
const cyan = chalk.hex('#06B6D4');
const grey = chalk.hex('#9CA3AF');
const dimGrey = chalk.hex('#6B7280');

// Gradient colors for the ASCII art (top to bottom, light → deep purple)
const gradientColors = [
  '#C4B5FD', // violet-300
  '#A78BFA', // violet-400
  '#8B5CF6', // violet-500
  '#7C3AED', // violet-600
  '#6D28D9', // violet-700
  '#5B21B6', // violet-800
];

const asciiLines = [
  ' ███╗   ███╗ ███████╗ ███╗   ██╗ ████████╗  ██████╗ ',
  ' ████╗ ████║ ██╔════╝ ████╗  ██║ ╚══██╔══╝ ██╔═══██╗',
  ' ██╔████╔██║ █████╗   ██╔██╗ ██║    ██║    ██║   ██║',
  ' ██║╚██╔╝██║ ██╔══╝   ██║╚██╗██║    ██║    ██║   ██║',
  ' ██║ ╚═╝ ██║ ███████╗ ██║ ╚████║    ██║     ╚██████╔╝',
  ' ╚═╝     ╚═╝ ╚══════╝ ╚═╝  ╚═══╝    ╚═╝      ╚═════╝ ',
];

const commands: Array<{ name: string; description: string }> = [
  { name: 'tokens',  description: 'List protocol tokens and supply' },
  { name: 'routes',  description: 'Discover trading routes' },
  { name: 'pools',   description: 'Inspect liquidity pools' },
  { name: 'quote',   description: 'Get swap quotes' },
  { name: 'swap',    description: 'Execute token swaps' },
  { name: 'trading', description: 'Check trading status & limits' },
  { name: 'info',    description: 'Protocol overview' },
  { name: 'cache',   description: 'Refresh route/token cache' },
];

export function showBanner(): void {
  console.log();

  // Gradient ASCII art
  for (let i = 0; i < asciiLines.length; i++) {
    const color = gradientColors[i] || gradientColors[gradientColors.length - 1];
    console.log(chalk.hex(color)(asciiLines[i]));
  }

  console.log();
  console.log(lightPurple('  Mento CLI v0.1.0 — The place for onchain FX'));
  console.log(darkPurple('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log();

  // Commands section
  console.log(purple.bold('  Commands'));
  console.log();

  for (const cmd of commands) {
    const name = cyan(`  ${cmd.name.padEnd(12)}`);
    const desc = grey(cmd.description);
    console.log(`${name} ${desc}`);
  }

  console.log();
  console.log(darkPurple('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(dimGrey('  Chain: celo · SDK: @mento-protocol/mento-sdk v3'));
  console.log();
  console.log(grey('  Run ') + cyan('mento <command> --help') + grey(' for details on any command.'));
  console.log();
}
