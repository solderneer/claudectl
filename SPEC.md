# claudectl Specification

## Overview

claudectl is a multi-agent Claude orchestration tool for macOS. It enables parallel Claude Code instances working on the same codebase, each in isolated git worktrees.

---

## Architecture

```
~/.claudectl/
└── repos/
    └── <repo-hash>/           # SHA256 of normalized remote URL (8 chars)
        ├── bare/              # Bare git repository (shared)
        └── worktrees/
            ├── alice/         # Worktree on feat/alice-work
            ├── betty/         # Worktree on fix/betty-fix-auth
            └── felix/         # Worktree on feat/felix-add-tests
```

### Key Design Decisions

1. **Git Worktrees over Clones**: Single shared `.git` directory, near-instant agent creation
2. **Central Location**: `~/.claudectl/` keeps project directories clean
3. **Repo Hashing**: Remote URL is normalized and hashed to identify repos uniquely
4. **Auto Branch Naming**: Branches follow `type/agent-description` convention

---

## How It Works

1. User runs `claudectl spawn 3` in any git repository
2. claudectl identifies the repo by hashing its remote URL
3. Creates/reuses a bare repo at `~/.claudectl/repos/<hash>/bare/`
4. For each agent:
   - Generates a branch name (e.g., `feat/alice-work`)
   - Creates a worktree at `~/.claudectl/repos/<hash>/worktrees/<name>/`
   - If worktree exists: resets to target branch (fast)
   - If new: creates fresh worktree
5. Launches terminal tabs (Kitty/iTerm) with Claude Code in each worktree

### Branch Naming

Branches are auto-generated based on agent name and optional task:

```bash
claudectl spawn                           # feat/alice-work, feat/betty-work
claudectl spawn --task "fix auth bug"     # fix/alice-fix-auth-bug, fix/betty-fix-auth-bug
claudectl spawn --task "add unit tests"   # test/alice-add-unit-tests, ...
```

Branch type is inferred from task keywords:

- `fix`, `bug`, `issue` → `fix/`
- `test` → `test/`
- `doc`, `readme` → `docs/`
- `refactor` → `refactor/`
- `chore`, `cleanup` → `chore/`
- Default → `feat/`

---

## Commands

### spawn

```bash
claudectl spawn [count] [options]
```

Spawn multiple Claude agents in terminal tabs.

**Options:**

- `-t, --terminal <type>` - Force terminal (kitty, iterm)
- `-b, --branch <name>` - Base branch for worktrees (default: current)
- `-T, --task <desc>` - Task description for branch naming
- `-c, --clean` - Delete existing worktrees and create fresh
- `-n, --no-notify` - Disable macOS notifications
- `--dry-run` - Preview without executing

**Examples:**

```bash
claudectl spawn                          # Spawn 3 agents
claudectl spawn 5                        # Spawn 5 agents
claudectl spawn --task "fix auth bug"    # Auto-generate fix/ branches
claudectl spawn --branch develop         # Base worktrees on develop
claudectl spawn --clean                  # Fresh worktrees
```

---

## Implementation Details

### Repo Identification

Remote URLs are normalized before hashing:

- `git@github.com:user/repo.git` → `github.com/user/repo`
- `https://github.com/user/repo.git` → `github.com/user/repo`

This ensures the same repo is identified regardless of clone method.

### Worktree Management

```typescript
// Create worktree
await createWorktree({
  repoHash: "a1b2c3d4",
  agentName: "alice",
  branchName: "feat/alice-work",
  baseBranch: "main",
});

// Check if worktree exists
const exists = await worktreeExists(repoHash, agentName);

// List all worktrees for a repo
const worktrees = await listWorktrees(repoHash);
```

### Agent Names

Names are drawn from a pool of memorable names: alice, betty, felix, grace, etc.

- Existing worktrees are reused when possible
- New names are picked randomly from unused pool
- `--clean` flag ignores existing and picks fresh names

---

## Future Considerations

The following features were considered but deferred to keep the initial implementation simple:

- **Task Queue**: Queue tasks for agents to pull from
- **Agent Communication**: MCP server for agent-orchestrator communication
- **Monitor Mode**: Live TUI dashboard showing all agents

These can be added later if the basic worktree-based spawning proves useful.

---

## References

- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
