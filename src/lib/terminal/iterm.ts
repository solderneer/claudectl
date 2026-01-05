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

/**
 * Close iTerm2 sessions matching Claude agent names
 */
export async function closeITermSessions(agentNames: string[]): Promise<number> {
  let closed = 0;

  for (const name of agentNames) {
    const script = `
      tell application "iTerm2"
        repeat with aWindow in windows
          repeat with aTab in tabs of aWindow
            repeat with aSession in sessions of aTab
              if name of aSession is "Claude [${name}]" then
                close aSession
              end if
            end repeat
          end repeat
        end repeat
      end tell
    `;

    try {
      await execa("osascript", ["-e", script]);
      closed++;
    } catch {
      // Session may not exist - continue
    }
  }

  return closed;
}
