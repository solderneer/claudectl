import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface ProjectAnalysis {
  name: string;
  type: "node" | "rust" | "python" | "go" | "unknown";
  hasTests: boolean;
  buildCommand?: string;
  testCommand?: string;
  lintCommand?: string;
}

export function analyzeProject(root: string): ProjectAnalysis {
  const analysis: ProjectAnalysis = {
    name: root.split("/").pop() || "project",
    type: "unknown",
    hasTests: false,
  };

  // Check for Node.js project
  const packageJsonPath = join(root, "package.json");
  if (existsSync(packageJsonPath)) {
    analysis.type = "node";
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      analysis.name = pkg.name || analysis.name;

      if (pkg.scripts?.test) {
        analysis.testCommand = "npm test";
        analysis.hasTests = true;
      }
      if (pkg.scripts?.build) {
        analysis.buildCommand = "npm run build";
      }
      if (pkg.scripts?.lint) {
        analysis.lintCommand = "npm run lint";
      }
    } catch {
      // Ignore parse errors
    }
    return analysis;
  }

  // Check for Rust project
  const cargoPath = join(root, "Cargo.toml");
  if (existsSync(cargoPath)) {
    analysis.type = "rust";
    analysis.buildCommand = "cargo build";
    analysis.testCommand = "cargo test";
    analysis.hasTests = true;
    return analysis;
  }

  // Check for Python project
  const pyprojectPath = join(root, "pyproject.toml");
  const requirementsPath = join(root, "requirements.txt");
  if (existsSync(pyprojectPath) || existsSync(requirementsPath)) {
    analysis.type = "python";
    if (existsSync(join(root, "pytest.ini")) || existsSync(join(root, "tests"))) {
      analysis.testCommand = "pytest";
      analysis.hasTests = true;
    }
    return analysis;
  }

  // Check for Go project
  const goModPath = join(root, "go.mod");
  if (existsSync(goModPath)) {
    analysis.type = "go";
    analysis.buildCommand = "go build ./...";
    analysis.testCommand = "go test ./...";
    analysis.hasTests = true;
    return analysis;
  }

  return analysis;
}

export function generateClaudeMd(analysis: ProjectAnalysis): string {
  const sections: string[] = [];

  sections.push(`# ${analysis.name}\n`);
  sections.push(`## Project Overview\n`);
  sections.push(`[Add a brief description of your project here]\n`);

  sections.push(`## Build & Development\n`);
  if (analysis.buildCommand) {
    sections.push(`- Build: \`${analysis.buildCommand}\``);
  } else {
    sections.push(`- Build: [Add build command]`);
  }
  if (analysis.testCommand) {
    sections.push(`- Test: \`${analysis.testCommand}\``);
  } else {
    sections.push(`- Test: [Add test command]`);
  }
  if (analysis.lintCommand) {
    sections.push(`- Lint: \`${analysis.lintCommand}\``);
  }
  sections.push("");

  sections.push(`## Code Style & Conventions\n`);
  sections.push(`[Add your coding conventions and style guidelines here]\n`);

  sections.push(`## Architecture\n`);
  sections.push(`[Describe the project structure and key components]\n`);

  sections.push(`## Common Tasks\n`);
  sections.push(`[List common development tasks and how to perform them]\n`);

  return sections.join("\n");
}
