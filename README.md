# claudectl

Multi-agent Claude orchestration CLI. Spawn multiple Claude Code instances across your codebase in seconds.

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

## Why?

When working on complex tasks, multiple Claude agents can divide and conquer - one handles tests, another refactors, a third updates docs. `claudectl` makes spawning these agents trivial.

## Features

- **Instant multi-agent setup** - Clone your repo and launch N Claude instances in parallel
- **Memorable agent names** - Agents get names like `betty`, `felix`, `grace` instead of numbers
- **Smart reuse** - Existing agent directories are reset instead of re-cloned (fast!)
- **Terminal support** - Works with Kitty and iTerm2
- **CLAUDE.md generator** - Interactive project context setup
- **macOS notifications** - Get notified when agents are ready

## Installation

```bash
# Clone and install locally
git clone https://github.com/solderneer/claudectl.git
cd claudectl
npm install
npm run build
npm link

# Or run directly
npx claudectl
```

## Usage

### Spawn Claude agents

```bash
# Spawn 3 agents (default)
claudectl spawn

# Spawn 5 agents
claudectl spawn 5

# Force a specific terminal
claudectl spawn --terminal kitty
claudectl spawn --terminal iterm

# Force fresh clones (delete existing agents)
claudectl spawn --clean

# Use a specific branch
claudectl spawn --branch feature/my-feature

# Preview without executing
claudectl spawn --dry-run
```

### Generate CLAUDE.md

```bash
claudectl init
```

Analyzes your project and generates a `CLAUDE.md` file with build commands and project context.

## Example Output

```
claudectl
Multi-agent Claude orchestration

v0.2.0

Reusing existing agents: betty, felix
Spawning 3 Claude agents in Kitty

[betty]   ✓ Running (reused)
[felix]   ✓ Running (reused)
[grace]   ⠋ Cloning repo...
```

## Options

```
-t, --terminal <type>   Force terminal (kitty, iterm)
-b, --branch <name>     Branch to clone (default: current)
-c, --clean             Delete existing agents and clone fresh
-n, --no-notify         Disable macOS notifications
--dry-run               Preview without executing
-v, --version           Show version
-h, --help              Show help
```

## How it works

1. Detects your git repository and current branch
2. Creates a `claude/` directory (auto-added to `.gitignore`)
3. Picks memorable agent names (prefers reusing existing ones)
4. For existing agents: resets to target branch (fast!)
5. For new agents: clones fresh
6. Opens each in a new terminal tab with Claude Code running

Each agent gets its own isolated working copy, so they can make changes without conflicts.

## Requirements

- macOS
- Git
- [Claude Code](https://claude.ai/download) installed
- Kitty or iTerm2 terminal

## Development

```bash
npm install
npm run build
npm run dev    # watch mode
```

## License

MIT
