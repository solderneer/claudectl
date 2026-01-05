import React from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";

export type AgentStatus =
  | "pending"
  | "cloning"
  | "creating-worktree"
  | "resetting"
  | "switching-branch"
  | "launching"
  | "running"
  | "error";

export interface AgentProgressProps {
  name: string;
  status: AgentStatus;
  branch?: string;
  isReused?: boolean;
  error?: string;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  pending: "gray",
  cloning: "yellow",
  "creating-worktree": "yellow",
  resetting: "yellow",
  "switching-branch": "yellow",
  launching: "cyan",
  running: "green",
  error: "red",
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  pending: "Pending",
  cloning: "Cloning bare repo",
  "creating-worktree": "Creating worktree",
  resetting: "Resetting branch",
  "switching-branch": "Switching branch",
  launching: "Launching terminal",
  running: "Running",
  error: "Error",
};

export function AgentProgress({ name, status, branch, isReused, error }: AgentProgressProps) {
  const isActive =
    status === "cloning" ||
    status === "creating-worktree" ||
    status === "resetting" ||
    status === "switching-branch" ||
    status === "launching";

  return (
    <Box flexDirection="column">
      <Box>
        <Box width={10}>
          <Text dimColor>[{name}]</Text>
        </Box>
        <Box marginLeft={1} width={2}>
          {isActive ? (
            <Spinner type="dots" />
          ) : (
            <Text color={STATUS_COLORS[status]}>
              {status === "running" ? "✓" : status === "error" ? "✗" : "○"}
            </Text>
          )}
        </Box>
        <Box marginLeft={1}>
          <Text color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Text>
          {isReused && status === "running" && <Text dimColor> (reused)</Text>}
          {error && (
            <Text color="red" dimColor>
              {" "}
              - {error}
            </Text>
          )}
        </Box>
      </Box>
      {branch && status === "running" && (
        <Box marginLeft={13}>
          <Text dimColor>↳ {branch}</Text>
        </Box>
      )}
    </Box>
  );
}
