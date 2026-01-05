/**
 * Branch types following the project convention
 */
export type BranchType = "feat" | "fix" | "refactor" | "docs" | "test" | "chore";

/**
 * Options for generating a branch name
 */
export interface BranchNameOptions {
  type: BranchType;
  agentName: string;
  description?: string;
}

/**
 * Convert text to a URL/branch-safe slug.
 *
 * Examples:
 *   "Fix the auth bug!" -> "fix-the-auth-bug"
 *   "Add user authentication" -> "add-user-authentication"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, "") // Trim leading/trailing hyphens
    .slice(0, 30); // Limit length
}

/**
 * Infer branch type from task description keywords.
 *
 * Examples:
 *   "fix the login bug" -> "fix"
 *   "add new feature" -> "feat"
 *   "write tests for auth" -> "test"
 *   "update documentation" -> "docs"
 *   "refactor the api layer" -> "refactor"
 */
export function inferBranchType(taskDescription: string): BranchType {
  const lower = taskDescription.toLowerCase();

  if (lower.includes("fix") || lower.includes("bug") || lower.includes("issue")) {
    return "fix";
  }
  if (lower.includes("test") || lower.includes("spec")) {
    return "test";
  }
  if (lower.includes("refactor") || lower.includes("cleanup") || lower.includes("clean up")) {
    return "refactor";
  }
  if (
    lower.includes("doc") ||
    lower.includes("readme") ||
    lower.includes("comment") ||
    lower.includes("jsdoc")
  ) {
    return "docs";
  }
  if (
    lower.includes("chore") ||
    lower.includes("deps") ||
    lower.includes("dependenc") ||
    lower.includes("upgrade") ||
    lower.includes("bump") ||
    lower.includes("config")
  ) {
    return "chore";
  }

  // Default to feat for new features
  return "feat";
}

/**
 * Generate a branch name following the convention: type/agent-description
 *
 * Examples:
 *   { type: "feat", agentName: "alice", description: "add auth" }
 *     -> "feat/alice-add-auth"
 *   { type: "fix", agentName: "betty" }
 *     -> "fix/betty-work"
 */
export function generateBranchName(options: BranchNameOptions): string {
  const { type, agentName, description } = options;

  if (description) {
    const slug = slugify(description);
    return `${type}/${agentName}-${slug}`;
  }

  return `${type}/${agentName}-work`;
}

/**
 * Convenience function to generate a branch name for an agent.
 * Automatically infers the branch type from the task description.
 *
 * @param agentName - The agent's name (e.g., "alice")
 * @param taskDescription - Optional task description for branch naming
 * @returns Branch name like "feat/alice-add-auth" or "feat/alice-work"
 */
export function generateAgentBranchName(agentName: string, taskDescription?: string): string {
  if (taskDescription) {
    const type = inferBranchType(taskDescription);
    return generateBranchName({ type, agentName, description: taskDescription });
  }

  return generateBranchName({ type: "feat", agentName });
}
