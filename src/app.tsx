import React from "react";
import { Box, Text } from "ink";
import { SpawnCommand } from "./commands/spawn.js";
import { ListCommand } from "./commands/list.js";
import { DeleteCommand } from "./commands/delete.js";
import { PruneCommand } from "./commands/prune.js";
import { CleanCommand } from "./commands/clean.js";
import { Header } from "./components/Header.js";

export interface AppProps {
  command: string;
  args: string[];
  flags: {
    terminal?: string;
    branch?: string;
    task?: string;
    agent?: string;
    all: boolean;
    force: boolean;
    notify: boolean;
    dryRun: boolean;
  };
}

const KNOWN_COMMANDS = ["spawn", "list", "delete", "prune", "clean"];

export function App({ command, args, flags }: AppProps) {
  const isKnownCommand = KNOWN_COMMANDS.includes(command);

  return (
    <Box flexDirection="column">
      <Header />
      {command === "spawn" && (
        <SpawnCommand
          count={args[0] ? parseInt(args[0], 10) : 1}
          terminal={flags.terminal as "kitty" | "iterm" | undefined}
          branch={flags.branch}
          task={flags.task}
          agent={flags.agent}
          notify={flags.notify}
          dryRun={flags.dryRun}
        />
      )}
      {command === "list" && <ListCommand all={flags.all} />}
      {command === "delete" && <DeleteCommand agentName={args[0] || ""} force={flags.force} />}
      {command === "prune" && <PruneCommand all={flags.all} force={flags.force} />}
      {command === "clean" && (
        <CleanCommand
          force={flags.force}
          terminal={flags.terminal as "kitty" | "iterm" | undefined}
        />
      )}
      {!isKnownCommand && (
        <Box marginTop={1}>
          <Text color="red">Unknown command: {command}</Text>
          <Text dimColor> Run 'claudectl --help' for usage.</Text>
        </Box>
      )}
    </Box>
  );
}
