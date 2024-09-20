mento-cli
=================

CLI for interacting with the Mento protocol


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/mento-cli.svg)](https://npmjs.org/package/mento-cli)
[![Downloads/week](https://img.shields.io/npm/dw/mento-cli.svg)](https://npmjs.org/package/mento-cli)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @mento-protocol/mento-cli
$ mento COMMAND
running command...
$ mento (--version)
@mento-protocol/mento-cli/0.1.0 linux-x64 node-v18.20.4
$ mento --help [COMMAND]
USAGE
  $ mento COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mento help [COMMAND]`](#mento-help-command)
* [`mento plugins`](#mento-plugins)
* [`mento plugins add PLUGIN`](#mento-plugins-add-plugin)
* [`mento plugins:inspect PLUGIN...`](#mento-pluginsinspect-plugin)
* [`mento plugins install PLUGIN`](#mento-plugins-install-plugin)
* [`mento plugins link PATH`](#mento-plugins-link-path)
* [`mento plugins remove [PLUGIN]`](#mento-plugins-remove-plugin)
* [`mento plugins reset`](#mento-plugins-reset)
* [`mento plugins uninstall [PLUGIN]`](#mento-plugins-uninstall-plugin)
* [`mento plugins unlink [PLUGIN]`](#mento-plugins-unlink-plugin)
* [`mento plugins update`](#mento-plugins-update)

## `mento help [COMMAND]`

Display help for mento.

```
USAGE
  $ mento help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for mento.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.10/src/commands/help.ts)_

## `mento plugins`

List installed plugins.

```
USAGE
  $ mento plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ mento plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.6/src/commands/plugins/index.ts)_

## `mento plugins add PLUGIN`

Installs a plugin into mento.

```
USAGE
  $ mento plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into mento.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the MENTO_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MENTO_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ mento plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ mento plugins add myplugin

  Install a plugin from a github url.

    $ mento plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ mento plugins add someuser/someplugin
```

## `mento plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ mento plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ mento plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.6/src/commands/plugins/inspect.ts)_

## `mento plugins install PLUGIN`

Installs a plugin into mento.

```
USAGE
  $ mento plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into mento.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the MENTO_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MENTO_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ mento plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ mento plugins install myplugin

  Install a plugin from a github url.

    $ mento plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ mento plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.6/src/commands/plugins/install.ts)_

## `mento plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ mento plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ mento plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.6/src/commands/plugins/link.ts)_

## `mento plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ mento plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mento plugins unlink
  $ mento plugins remove

EXAMPLES
  $ mento plugins remove myplugin
```

## `mento plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ mento plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.6/src/commands/plugins/reset.ts)_

## `mento plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ mento plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mento plugins unlink
  $ mento plugins remove

EXAMPLES
  $ mento plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.6/src/commands/plugins/uninstall.ts)_

## `mento plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ mento plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mento plugins unlink
  $ mento plugins remove

EXAMPLES
  $ mento plugins unlink myplugin
```

## `mento plugins update`

Update installed plugins.

```
USAGE
  $ mento plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.6/src/commands/plugins/update.ts)_
<!-- commandsstop -->
* `mento pools list`
* `mento pool info [POOLID]`
