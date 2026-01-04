export type TerminalType = "kitty" | "iterm" | "unknown";

export function detectTerminal(): TerminalType {
  // Check environment variables set by terminal emulators
  if (process.env.KITTY_WINDOW_ID) {
    return "kitty";
  }

  if (process.env.ITERM_SESSION_ID) {
    return "iterm";
  }

  // Check TERM_PROGRAM for additional hints
  const termProgram = process.env.TERM_PROGRAM?.toLowerCase();
  if (termProgram === "iterm.app") {
    return "iterm";
  }

  return "unknown";
}

export function getTerminalName(type: TerminalType): string {
  switch (type) {
    case "kitty":
      return "Kitty";
    case "iterm":
      return "iTerm2";
    default:
      return "Unknown";
  }
}
