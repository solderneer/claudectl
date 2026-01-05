import { getExistingAgentNames } from "./worktree.js";

// Short, memorable names for Claude agents
const AGENT_NAMES = [
  "alice",
  "betty",
  "clara",
  "diana",
  "emma",
  "felix",
  "grace",
  "henry",
  "iris",
  "james",
  "kate",
  "leo",
  "maya",
  "noah",
  "olive",
  "pearl",
  "quinn",
  "ruby",
  "sam",
  "tara",
  "uma",
  "vera",
  "wade",
  "xena",
  "yuki",
  "zara",
  "amber",
  "blake",
  "casey",
  "drew",
  "eden",
  "finn",
  "gwen",
  "hank",
  "ivy",
  "jade",
  "kira",
  "liam",
  "milo",
  "nora",
  "owen",
  "piper",
  "rex",
  "sage",
  "theo",
  "wren",
];

/**
 * Get list of existing agent names from worktrees
 */
export async function getExistingAgents(repoHash: string): Promise<string[]> {
  const existingNames = await getExistingAgentNames(repoHash);
  // Only return names that are in our known agent pool
  return existingNames.filter((name) => AGENT_NAMES.includes(name));
}

/**
 * Pick agent names, preferring existing ones first.
 * This is now async since it needs to check worktrees.
 * @deprecated Use pickNewAgentNames for default behavior
 */
export async function pickAgentNames(count: number, repoHash: string): Promise<string[]> {
  const existing = await getExistingAgents(repoHash);
  const result: string[] = [];

  // First, use existing agents (up to count)
  for (const name of existing) {
    if (result.length >= count) break;
    result.push(name);
  }

  // If we need more, pick random new names
  if (result.length < count) {
    const available = AGENT_NAMES.filter((n) => !result.includes(n) && !existing.includes(n));
    const shuffled = available.sort(() => Math.random() - 0.5);
    const needed = count - result.length;
    result.push(...shuffled.slice(0, needed));
  }

  return result;
}

/**
 * Pick new agent names that are not currently in use.
 * Always returns unused names (never reuses existing agents).
 */
export async function pickNewAgentNames(count: number, repoHash: string): Promise<string[]> {
  const existing = await getExistingAgents(repoHash);
  const available = AGENT_NAMES.filter((n) => !existing.includes(n));

  if (available.length < count) {
    throw new Error(
      `Not enough available agent names. Requested ${count}, but only ${available.length} unused names available. ` +
        `Use 'claudectl prune' to remove existing agents or 'claudectl delete <name>' to remove specific ones.`
    );
  }

  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Check if an agent name corresponds to an existing worktree
 */
export async function isExistingAgent(name: string, repoHash: string): Promise<boolean> {
  const existing = await getExistingAgents(repoHash);
  return existing.includes(name);
}

/**
 * Get random agent names (ignores existing, for --clean mode)
 */
export function getRandomAgentNames(count: number): string[] {
  const shuffled = [...AGENT_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Check if a name is a valid agent name
 */
export function isValidAgentName(name: string): boolean {
  return AGENT_NAMES.includes(name);
}

/**
 * Get all available agent names
 */
export function getAllAgentNames(): string[] {
  return [...AGENT_NAMES];
}
