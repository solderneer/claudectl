import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { existsSync } from "fs";
import { join } from "path";
import { AgentProgress, AgentStatus } from "../components/AgentProgress.js";
import {
  detectTerminal,
  getTerminalName,
  launchKittyTab,
  launchITermTab,
  type TerminalType,
} from "../lib/terminal/index.js";
import { getGitInfo, isGitRepo, GitError } from "../lib/git.js";
import { notifySpawnComplete } from "../lib/notifications.js";
import { pickAgentNames, getRandomAgentNames } from "../lib/names.js";
import { hashRemoteUrl } from "../lib/repo-hash.js";
import { ensureClaudectlDirs, getWorktreePath, getBareRepoPath } from "../lib/paths.js";
import {
  ensureBareRepo,
  createWorktree,
  worktreeExists,
  getDefaultBranch,
  WorktreeError,
} from "../lib/worktree.js";
import { generateAgentBranchName } from "../lib/branch.js";

export interface SpawnCommandProps {
  count: number;
  terminal?: "kitty" | "iterm";
  branch?: string;
  task?: string;
  notify: boolean;
  dryRun: boolean;
  clean: boolean;
}

interface AgentState {
  name: string;
  status: AgentStatus;
  branch: string;
  worktreePath: string;
  isReused: boolean;
  error?: string;
}

type SpawnPhase = "init" | "preparing" | "spawning" | "done";

async function findClaudeBinary(): Promise<string> {
  const locations = [
    join(process.env.HOME || "", ".claude/local/claude"),
    "/usr/local/bin/claude",
    "claude",
  ];

  for (const loc of locations) {
    if (existsSync(loc)) {
      return loc;
    }
  }

  return "claude";
}

export function SpawnCommand({
  count,
  terminal,
  branch,
  task,
  notify,
  dryRun,
  clean,
}: SpawnCommandProps) {
  const { exit } = useApp();
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [terminalType, setTerminalType] = useState<TerminalType | null>(null);
  const [phase, setPhase] = useState<SpawnPhase>("init");
  const [repoHash, setRepoHash] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [baseBranch, setBaseBranch] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    if (count < 1 || count > 10) {
      setError("Count must be between 1 and 10");
      return;
    }

    const init = async () => {
      try {
        if (!(await isGitRepo())) {
          setError("Not in a git repository");
          return;
        }

        const info = await getGitInfo();
        const hash = hashRemoteUrl(info.remote);
        setRepoHash(hash);
        setRemoteUrl(info.remote);
        setBaseBranch(branch || info.branch);

        const detected = terminal || detectTerminal();
        if (detected === "unknown") {
          setError("Could not detect terminal. Use --terminal to specify kitty or iterm");
          return;
        }
        setTerminalType(detected as TerminalType);

        // Ensure claudectl directories exist
        ensureClaudectlDirs();

        // Pick agent names
        let names: string[];
        if (clean) {
          names = getRandomAgentNames(count);
        } else {
          names = await pickAgentNames(count, hash);
        }

        // Check which agents already exist
        const agentStates: AgentState[] = await Promise.all(
          names.map(async (name) => {
            const exists = !clean && (await worktreeExists(hash, name));
            const branchName = generateAgentBranchName(name, task);
            return {
              name,
              status: "pending" as AgentStatus,
              branch: branchName,
              worktreePath: getWorktreePath(hash, name),
              isReused: exists,
              error: undefined,
            };
          })
        );

        setAgents(agentStates);

        if (dryRun) {
          setPhase("done");
          return;
        }

        setPhase("preparing");
      } catch (err) {
        if (err instanceof GitError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    init();
  }, [count, terminal, branch, task, dryRun, clean]);

  // Prepare: ensure bare repo exists
  useEffect(() => {
    if (phase !== "preparing" || !repoHash || !remoteUrl) return;

    const prepare = async () => {
      try {
        // Update first agent to show cloning status
        setAgents((prev) =>
          prev.map((a, idx) => (idx === 0 ? { ...a, status: "cloning" as AgentStatus } : a))
        );

        // Ensure bare repo exists (clones if needed)
        await ensureBareRepo(remoteUrl, repoHash);

        // Get default branch if we need it
        if (!baseBranch) {
          const bareRepoPath = getBareRepoPath(repoHash);
          const defaultBranch = await getDefaultBranch(bareRepoPath);
          setBaseBranch(defaultBranch);
        }

        setPhase("spawning");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    prepare();
  }, [phase, repoHash, remoteUrl, baseBranch]);

  // Spawn agents: create worktrees and launch terminals
  useEffect(() => {
    if (phase !== "spawning" || !repoHash || !terminalType || agents.length === 0 || !baseBranch)
      return;

    const spawn = async () => {
      const claudePath = await findClaudeBinary();

      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];

        // Update status to creating worktree
        setAgents((prev) =>
          prev.map((a, idx) =>
            idx === i ? { ...a, status: agent.isReused ? "resetting" : "creating-worktree" } : a
          )
        );

        try {
          // Create or reset worktree
          await createWorktree({
            repoHash,
            agentName: agent.name,
            branchName: agent.branch,
            baseBranch,
          });

          // Update to launching
          setAgents((prev) =>
            prev.map((a, idx) => (idx === i ? { ...a, status: "launching" } : a))
          );

          // Launch terminal
          const launchOptions = {
            name: agent.name,
            cwd: agent.worktreePath,
            command: claudePath,
          };

          if (terminalType === "kitty") {
            await launchKittyTab(launchOptions);
          } else {
            await launchITermTab(launchOptions);
          }

          // Update to running
          setAgents((prev) => prev.map((a, idx) => (idx === i ? { ...a, status: "running" } : a)));
        } catch (err) {
          const errorMessage =
            err instanceof WorktreeError
              ? err.message
              : err instanceof Error
                ? err.message
                : String(err);

          setAgents((prev) =>
            prev.map((a, idx) => (idx === i ? { ...a, status: "error", error: errorMessage } : a))
          );
        }
      }

      if (notify) {
        await notifySpawnComplete(count);
      }

      setPhase("done");
    };

    spawn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, repoHash, terminalType, agents.length, baseBranch, count, notify]);

  // Exit when done
  useEffect(() => {
    if (phase === "done" && !dryRun) {
      const timer = setTimeout(() => exit(), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, dryRun, exit]);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (dryRun && phase === "done") {
    const reusedNames = agents.filter((a) => a.isReused).map((a) => a.name);
    return (
      <Box flexDirection="column">
        <Text color="yellow">Dry run mode - no actions taken</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Would spawn {count} agent(s):</Text>
          <Text dimColor> Terminal: {getTerminalName(terminalType || "unknown")}</Text>
          <Text dimColor> Base branch: {baseBranch || "default"}</Text>
          <Text dimColor> Repo hash: {repoHash}</Text>
          {agents.map((a) => (
            <Text key={a.name} dimColor>
              {" "}
              [{a.name}] → {a.branch}
            </Text>
          ))}
          {reusedNames.length > 0 && !clean && (
            <Text dimColor> Reusing worktrees: {reusedNames.join(", ")}</Text>
          )}
          {clean && <Text dimColor> Mode: Clean (fresh worktrees)</Text>}
        </Box>
      </Box>
    );
  }

  const reusedNames = agents.filter((a) => a.isReused).map((a) => a.name);

  return (
    <Box flexDirection="column">
      {reusedNames.length > 0 && !clean && phase !== "init" && (
        <Box marginBottom={1}>
          <Text color="blue">Reusing existing worktrees: {reusedNames.join(", ")}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text>
          Spawning{" "}
          <Text color="#D97757" bold>
            {count}
          </Text>{" "}
          Claude agent
          {count === 1 ? "" : "s"} in{" "}
          <Text color="cyan">{getTerminalName(terminalType || "unknown")}</Text>
        </Text>
      </Box>

      <Box flexDirection="column">
        {agents.map((agent) => (
          <AgentProgress
            key={agent.name}
            name={agent.name}
            status={agent.status}
            branch={agent.branch}
            isReused={agent.isReused}
            error={agent.error}
          />
        ))}
      </Box>

      {phase === "done" && (
        <Box marginTop={1}>
          <Text color="green">All agents spawned successfully!</Text>
        </Box>
      )}
    </Box>
  );
}
