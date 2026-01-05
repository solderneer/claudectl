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
    spawn [count]    Spawn multiple Claude agents (default: 3)
    init             Generate CLAUDE.md for current project

  Options
    -t, --terminal   Force terminal type (kitty, iterm)
    -b, --branch     Base branch for worktrees (default: current)
    -T, --task       Task description for branch naming
    -c, --clean      Delete existing worktrees and create fresh
    -n, --no-notify  Disable completion notifications
    --dry-run        Show what would be done without executing

  Examples
    $ claudectl spawn 5
    $ claudectl spawn --terminal iterm
    $ claudectl spawn --task "fix auth bug"
    $ claudectl spawn --clean
    $ claudectl init
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
      clean: {
        type: "boolean",
        shortFlag: "c",
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
