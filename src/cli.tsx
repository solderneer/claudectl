#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import { App } from "./app.js";

const cli = meow(
  `
  Usage
    $ claudectl <command> [options]

  Commands
    spawn [count]    Spawn new Claude agents (default: 1)
    list             List existing Claude agents
    delete <agent>   Delete a specific agent
    prune            Remove all agents for current repository
    clean            Close tabs and remove agents for current repository

  Spawn Options
    -a, --agent      Reuse an existing agent (mutually exclusive with count)
    -t, --terminal   Force terminal type (kitty, iterm)
    -b, --branch     Base branch for worktrees (default: current)
    -T, --task       Task description for branch naming
    -n, --no-notify  Disable completion notifications
    --dry-run        Show what would be done without executing

  List Options
    --all            List agents across all repositories

  Delete Options
    -f, --force      Skip confirmation prompt

  Prune Options
    --all            Prune agents across all repositories
    -f, --force      Skip confirmation prompt

  Clean Options
    -t, --terminal   Force terminal type (kitty, iterm)
    -f, --force      Skip confirmation prompt

  Examples
    $ claudectl spawn 5                     # Spawn 5 new agents
    $ claudectl spawn --agent alice         # Reuse agent alice
    $ claudectl spawn --task "fix auth bug" # New agents with fix/ branches
    $ claudectl list                        # List agents for current repo
    $ claudectl list --all                  # List all agents
    $ claudectl delete alice                # Delete agent alice
    $ claudectl prune                       # Remove all agents (current repo)
    $ claudectl prune --all --force         # Remove all agents everywhere
    $ claudectl clean                       # Close tabs and remove agents
    $ claudectl clean --force               # Skip confirmation
`,
  {
    importMeta: import.meta,
    flags: {
      terminal: {
        type: "string",
        shortFlag: "t",
      },
      branch: {
        type: "string",
        shortFlag: "b",
      },
      task: {
        type: "string",
        shortFlag: "T",
      },
      agent: {
        type: "string",
        shortFlag: "a",
      },
      all: {
        type: "boolean",
        default: false,
      },
      force: {
        type: "boolean",
        shortFlag: "f",
        default: false,
      },
      notify: {
        type: "boolean",
        shortFlag: "n",
        default: true,
      },
      dryRun: {
        type: "boolean",
        default: false,
      },
    },
  }
);

const [command = "spawn", ...args] = cli.input;

render(<App command={command} args={args} flags={cli.flags} />);
