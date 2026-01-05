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
- **Smart reuse** - Existing worktrees are reset instead of recreated (fast!)
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
# Spawn 3 agents (default)
claudectl spawn

# Spawn 5 agents
claudectl spawn 5

# Spawn with task description (auto-generates branch names)
claudectl spawn --task "fix auth bug"
# Creates: fix/alice-fix-auth-bug, fix/betty-fix-auth-bug, ...

# Force fresh worktrees
claudectl spawn --clean

# Use a specific base branch
claudectl spawn --branch develop

# Preview without executing
claudectl spawn --dry-run
```

## Example Output

```
claudectl
Multi-agent Claude orchestration

v1.0.0

Reusing existing worktrees: betty, felix
Spawning 3 Claude agents in Kitty

[betty]   ✓ Running on fix/betty-fix-auth (reused)
[felix]   ✓ Running on feat/felix-work (reused)
[grace]   ⠋ Creating worktree...
```

## Options

```
-t, --terminal <type>   Force terminal (kitty, iterm)
-b, --branch <name>     Base branch for worktrees (default: current)
-T, --task <desc>       Task description for branch naming
-c, --clean             Delete existing worktrees and create fresh
-n, --no-notify         Disable macOS notifications
--dry-run               Preview without executing
-v, --version           Show version
-h, --help              Show help
```

## How it works

1. Detects your git repository and remote URL
2. Creates a bare repo at `~/.claudectl/repos/<hash>/bare/`
3. For each agent:
   - Generates a branch name based on agent name and task
   - Creates a worktree at `~/.claudectl/repos/<hash>/worktrees/<name>/`
   - If existing: resets to target branch
   - If new: creates fresh worktree
4. Opens each in a new terminal tab with Claude Code running

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
