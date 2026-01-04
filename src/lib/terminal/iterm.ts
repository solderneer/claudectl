import { execa } from "execa";

export interface LaunchOptions {
  name: string;
  cwd: string;
  command: string;
}

export async function launchITermTab(options: LaunchOptions): Promise<void> {
  const script = `
    tell application "iTerm2"
      tell current window
        create tab with default profile
        tell current session
          write text "cd '${options.cwd}' && ${options.command}"
          set name to "Claude [${options.name}]"
        end tell
      end tell
    end tell
  `;

  await execa("osascript", ["-e", script]);
}

export async function isITermAvailable(): Promise<boolean> {
  try {
    const result = await execa("osascript", [
      "-e",
      'tell application "System Events" to (name of processes) contains "iTerm2"',
    ]);
    return result.stdout.trim() === "true";
  } catch {
    return false;
  }
}
