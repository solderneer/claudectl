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
