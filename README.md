# claudectl

Multi-agent Claude orchestration CLI. Spawn multiple Claude Code instances across your codebase in seconds.

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

## Why?

When working on complex tasks, multiple Claude agents can divide and conquer - one handles tests, another refactors, a third updates docs. `claudectl` makes spawning these agents trivial.

## Features

- **Git worktrees** - Agents share a single `.git` directory, saving disk space and spawn time
- **Auto branch naming** - Agents get branches like `feat/alice-work` or `fix/betty-fix-auth`
- **Memorable agent names** - Names like `betty`, `felix`, `grace` instead of numbers
- **Docker-style management** - `list`, `delete`, and `prune` commands to manage agents
- **Terminal support** - Works with Kitty and iTerm2
- **Central storage** - All worktrees live in `~/.claudectl/`, keeping your project clean

## Installation

```bash
# Clone and install
git clone https://github.com/solderneer/claudectl.git
cd claudectl
npm install
npm run build
npm link
```

## Usage

### Spawn Claude agents

```bash
# Spawn 3 new agents (default)
claudectl spawn

# Spawn 5 new agents
claudectl spawn 5

# Spawn with task description (auto-generates branch names)
claudectl spawn --task "fix auth bug"
# Creates: fix/alice-fix-auth-bug, fix/betty-fix-auth-bug, ...

# Reuse an existing agent
claudectl spawn --agent alice

# Reuse agent with a new task (creates new branch)
claudectl spawn --agent alice --task "add unit tests"

# Use a specific base branch
claudectl spawn --branch develop

# Preview without executing
claudectl spawn --dry-run
```

### List agents

```bash
# List agents for current repository
claudectl list

# List all agents across all repositories
claudectl list --all
```

### Delete agents

```bash
# Delete a specific agent (with confirmation)
claudectl delete alice

# Force delete without confirmation
claudectl delete alice --force
```

### Prune all agents

```bash
# Remove all agents for current repository
claudectl prune

# Remove all agents everywhere
claudectl prune --all

# Skip confirmation
claudectl prune --force
```

## Example Output

### Spawning new agents

```
claudectl
Multi-agent Claude orchestration

v1.0.0

Spawning 3 Claude agents in Kitty

[alice]   ✓ Running
          ↳ feat/alice-work
[betty]   ✓ Running
          ↳ feat/betty-work
[felix]   ⠋ Creating worktree...
```

### Listing agents

```
Found 3 agents

solderneer/claudectl (a1b2c3d4)
  alice         feat/alice-work          2h ago
  betty         fix/betty-fix-auth       1d ago
  felix         feat/felix-add-tests     3d ago
```

## Options

### Spawn

```
-a, --agent <name>      Reuse an existing agent
-t, --terminal <type>   Force terminal (kitty, iterm)
-b, --branch <name>     Base branch for worktrees (default: current)
-T, --task <desc>       Task description for branch naming
-n, --no-notify         Disable macOS notifications
--dry-run               Preview without executing
```

### List / Prune

```
--all                   Apply to all repositories
-f, --force             Skip confirmation (delete/prune only)
```

## How it works

1. Detects your git repository and remote URL
2. Creates a bare repo at `~/.claudectl/repos/<hash>/bare/`
3. For each agent:
   - Picks an unused agent name from the pool
   - Generates a branch name based on agent name and task
   - Creates a fresh worktree at `~/.claudectl/repos/<hash>/worktrees/<name>/`
4. Opens each in a new terminal tab with Claude Code running

When reusing an existing agent (`--agent`):

- The existing worktree is preserved
- If `--task` is provided, a new branch is created and checked out
- Without `--task`, continues on the current branch

### Directory Structure

```
~/.claudectl/
└── repos/
    └── a1b2c3d4/              # Repo hash (from remote URL)
        ├── bare/              # Shared bare git repo
        └── worktrees/
            ├── alice/         # feat/alice-work
            ├── betty/         # fix/betty-fix-auth
            └── felix/         # feat/felix-add-tests
```

## Requirements

- macOS
- Git
- [Claude Code](https://claude.ai/download) installed
- Kitty or iTerm2 terminal

## Development

```bash
npm install
npm run build
npm run dev       # Watch mode
npm run test      # Run tests
npm run lint      # Lint code
```

## License

MIT
