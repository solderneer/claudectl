import React from "react";
import { Box, Text } from "ink";
import { SpawnCommand } from "./commands/spawn.js";
import { Header } from "./components/Header.js";

export interface AppProps {
  command: string;
  args: string[];
  flags: {
    terminal?: string;
    branch?: string;
    task?: string;
    clean: boolean;
    notify: boolean;
    dryRun: boolean;
  };
}

export function App({ command, args, flags }: AppProps) {
  return (
    <Box flexDirection="column">
      <Header />
      {command === "spawn" && (
        <SpawnCommand
          count={args[0] ? parseInt(args[0], 10) : 3}
          terminal={flags.terminal as "kitty" | "iterm" | undefined}
          branch={flags.branch}
          task={flags.task}
          clean={flags.clean}
          notify={flags.notify}
          dryRun={flags.dryRun}
        />
      )}
      {command !== "spawn" && (
        <Box marginTop={1}>
          <Text color="red">Unknown command: {command}</Text>
        </Box>
      )}
    </Box>
  );
}
