# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build      # Build with tsup (outputs to dist/)
npm run dev        # Watch mode for development
npm run typecheck  # Type check without emitting
npm run lint       # Run ESLint
npm run lint:fix   # Fix lint errors and format with Prettier
npm run test       # Run tests once
npm run test:watch # Run tests in watch mode
```

After building, test locally with:

```bash
node bin/claudectl.js spawn --dry-run
node bin/claudectl.js spawn 2 --task "fix auth bug" --dry-run
node bin/claudectl.js --help
```

To install globally for testing:

```bash
npm link
claudectl spawn 3
```

## Conventions

### Branch Naming

```
type/short-description
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

Examples: `feat/add-tmux-support`, `fix/terminal-detection`

### PR and Commit Messages

```
type: short description
```

Examples: `feat: add tmux terminal support`, `fix: correct iTerm2 tab naming`

## Architecture

This is a React-based terminal UI application using [Ink](https://github.com/vadimdemedes/ink) (React for CLIs).

### Entry Flow

```
bin/claudectl.js → src/cli.tsx (meow arg parsing) → src/app.tsx (routes to commands)
```

### Directory Structure

Agent worktrees are stored centrally:

```
~/.claudectl/
├── repos/
│   └── <repo-hash>/           # SHA256 of normalized remote URL (8 chars)
│       ├── bare/              # Bare git repository (shared)
│       └── worktrees/
│           ├── alice/         # Worktree on feat/alice-work
│           └── betty/         # Worktree on fix/betty-fix-auth
├── queues/                    # Task queues (Phase 2)
└── ipc/                       # Agent communication (Phase 3)
```

### Key Layers

**Commands** (`src/commands/`)

- `spawn.tsx` - Creates worktrees and launches Claude in terminal tabs
- `list.tsx` - Lists existing Claude agents
- `delete.tsx` - Deletes a specific agent
- `prune.tsx` - Removes all agents for a repository

**Components** (`src/components/`)

- Ink/React components for terminal UI (spinners, progress indicators)
- `AgentProgress.tsx` - Per-agent status display with name, branch, status, spinner

**Lib** (`src/lib/`)

- `paths.ts` - Centralized path management for ~/.claudectl structure
- `repo-hash.ts` - Repository identification via URL hashing
- `worktree.ts` - Git worktree operations (create, remove, list, reset)
- `branch.ts` - Branch naming conventions (type/agent-description)
- `names.ts` - Agent name pool and selection logic
- `terminal/` - Terminal detection and tab launching (Kitty/iTerm)
- `git.ts` - Core git operations (getGitInfo, isGitRepo)
- `notifications.ts` - macOS notifications via osascript

### Key Patterns

- **Git worktrees**: Uses a single bare repo with worktrees instead of full clones. Dramatically reduces disk space and spawn time.
- **Agent names**: Uses memorable names (betty, felix, grace). Names persist via worktree directory names.
- **Branch naming**: Auto-generates branches like `feat/alice-fix-auth` based on agent name and task description.
- **Always new**: By default, spawn always creates new agents. Use `--agent <name>` to explicitly reuse an existing agent.
- **Terminal abstraction**: `LaunchOptions` interface with `name`, `cwd`, `command` - implementations for Kitty and iTerm2.

### State Management

SpawnCommand uses React hooks with phases: `init` → `preparing` → `spawning` → `done`. Agent state tracks `name`, `status`, `branch`, `worktreePath`, `isReused`, `error`.

## CLI Usage

```bash
# Spawn 3 new agents (default)
claudectl spawn

# Spawn with task description (auto-generates branch names)
claudectl spawn 2 --task "fix auth bug"
# Creates: fix/alice-fix-auth-bug, fix/betty-fix-auth-bug

# Reuse an existing agent
claudectl spawn --agent alice

# Reuse agent with new task (creates new branch)
claudectl spawn --agent alice --task "add tests"

# Dry run to see what would happen
claudectl spawn --dry-run

# Specify base branch
claudectl spawn --branch develop

# List agents for current repo
claudectl list

# List all agents
claudectl list --all

# Delete a specific agent
claudectl delete alice

# Remove all agents for current repo
claudectl prune

# Remove all agents everywhere
claudectl prune --all --force
```
