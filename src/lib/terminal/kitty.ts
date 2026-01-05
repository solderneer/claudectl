import { execa } from "execa";

export interface LaunchOptions {
  name: string;
  cwd: string;
  command: string;
}

export async function launchKittyTab(options: LaunchOptions): Promise<void> {
  await execa("kitten", [
    "@",
    "launch",
    "--type=tab",
    "--hold",
    `--tab-title=Claude [${options.name}]`,
    `--cwd=${options.cwd}`,
    "zsh",
    "-l",
    "-c",
    options.command,
  ]);
}

export async function isKittyAvailable(): Promise<boolean> {
  try {
    await execa("kitten", ["@", "ls"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Close Kitty tabs matching Claude agent names
 */
export async function closeKittyTabs(agentNames: string[]): Promise<number> {
  let closed = 0;

  for (const name of agentNames) {
    try {
      await execa("kitten", ["@", "close-tab", "--match", `title:^Claude \\[${name}\\]$`]);
      closed++;
    } catch {
      // Tab may not exist or already closed - continue
    }
  }

  return closed;
}
