import React from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";

export type AgentStatus = "pending" | "cloning" | "resetting" | "launching" | "running" | "error";

export interface AgentProgressProps {
  name: string;
  status: AgentStatus;
  isReused?: boolean;
  error?: string;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  pending: "gray",
  cloning: "yellow",
  resetting: "yellow",
  launching: "cyan",
  running: "green",
  error: "red",
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  pending: "Pending",
  cloning: "Cloning repo",
  resetting: "Resetting repo",
  launching: "Launching terminal",
  running: "Running",
  error: "Error",
};

export function AgentProgress({ name, status, isReused, error }: AgentProgressProps) {
  const isActive = status === "cloning" || status === "resetting" || status === "launching";

  return (
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
        {isReused && status === "running" && (
          <Text dimColor> (reused)</Text>
        )}
        {error && (
          <Text color="red" dimColor>
            {" "}
            - {error}
          </Text>
        )}
      </Box>
    </Box>
  );
}
