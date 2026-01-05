import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { ConfirmInput, Spinner } from "@inkjs/ui";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import { getGitRoot, isGitRepo } from "../lib/git.js";
import { analyzeProject, generateClaudeMd, type ProjectAnalysis } from "../lib/claude-md.js";

type Phase = "checking" | "exists" | "confirm" | "generating" | "done" | "error";

export function InitCommand() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [gitRoot, setGitRoot] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);

  useEffect(() => {
    const check = async () => {
      if (!(await isGitRepo())) {
        setError("Not in a git repository");
        setPhase("error");
        return;
      }

      const root = await getGitRoot();
      setGitRoot(root);

      const claudeMdPath = join(root, "CLAUDE.md");
      if (existsSync(claudeMdPath)) {
        setPhase("exists");
        return;
      }

      const projectAnalysis = analyzeProject(root);
      setAnalysis(projectAnalysis);
      setPhase("confirm");
    };

    check();
  }, []);

  const handleConfirm = () => {
    if (!gitRoot || !analysis) {
      exit();
      return;
    }

    setPhase("generating");

    const claudeMdPath = join(gitRoot, "CLAUDE.md");
    const content = generateClaudeMd(analysis);
    writeFileSync(claudeMdPath, content);

    setPhase("done");
    setTimeout(() => exit(), 1000);
  };

  const handleCancel = () => {
    exit();
  };

  if (phase === "error") {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (phase === "checking") {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Checking project...</Text>
      </Box>
    );
  }

  if (phase === "exists") {
    return (
      <Box flexDirection="column">
        <Text color="yellow">CLAUDE.md already exists in this project.</Text>
        <Text dimColor>Edit it manually to update project context.</Text>
      </Box>
    );
  }

  if (phase === "confirm" && analysis) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text>
            Detected <Text color="cyan">{analysis.type}</Text> project:{" "}
            <Text bold>{analysis.name}</Text>
          </Text>
        </Box>

        {analysis.buildCommand && <Text dimColor> Build: {analysis.buildCommand}</Text>}
        {analysis.testCommand && <Text dimColor> Test: {analysis.testCommand}</Text>}

        <Box marginTop={1}>
          <Text>Generate CLAUDE.md? </Text>
          <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />
        </Box>
      </Box>
    );
  }

  if (phase === "generating") {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Generating CLAUDE.md...</Text>
      </Box>
    );
  }

  if (phase === "done") {
    return (
      <Box flexDirection="column">
        <Text color="green">Created CLAUDE.md successfully!</Text>
        <Text dimColor>Edit the file to add more project context.</Text>
      </Box>
    );
  }

  return null;
}
