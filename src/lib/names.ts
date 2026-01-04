import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Short, memorable names for Claude agents
const AGENT_NAMES = [
  "alice", "betty", "clara", "diana", "emma",
  "felix", "grace", "henry", "iris", "james",
  "kate", "leo", "maya", "noah", "olive",
  "pearl", "quinn", "ruby", "sam", "tara",
  "uma", "vera", "wade", "xena", "yuki", "zara",
  "amber", "blake", "casey", "drew", "eden",
  "finn", "gwen", "hank", "ivy", "jade",
  "kira", "liam", "milo", "nora", "owen",
  "piper", "rex", "sage", "theo", "wren",
];

/**
 * Get list of existing agent directories in the claude folder
 */
export function getExistingAgents(claudeDir: string): string[] {
  if (!existsSync(claudeDir)) {
    return [];
  }

  return readdirSync(claudeDir)
    .filter((name) => {
      const agentPath = join(claudeDir, name);
      // Must be a directory and have a .git folder (valid repo)
      return (
        statSync(agentPath).isDirectory() &&
        existsSync(join(agentPath, ".git"))
      );
    })
    .filter((name) => AGENT_NAMES.includes(name)); // Only count known agent names
}

/**
 * Pick agent names, preferring existing ones first
 */
export function pickAgentNames(count: number, claudeDir: string): string[] {
  const existing = getExistingAgents(claudeDir);
  const result: string[] = [];

  // First, use existing agents (up to count)
  for (const name of existing) {
    if (result.length >= count) break;
    result.push(name);
  }

  // If we need more, pick random new names
  if (result.length < count) {
    const available = AGENT_NAMES.filter((n) => !result.includes(n));
    const shuffled = available.sort(() => Math.random() - 0.5);
    const needed = count - result.length;
    result.push(...shuffled.slice(0, needed));
  }

  return result;
}

/**
 * Check if an agent name corresponds to an existing directory
 */
export function isExistingAgent(name: string, claudeDir: string): boolean {
  const agentPath = join(claudeDir, name);
  return existsSync(agentPath) && existsSync(join(agentPath, ".git"));
}
