# claudectl Specification

## Overview

claudectl is a multi-agent Claude orchestration tool for macOS. It enables parallel Claude Code instances working on the same codebase, each in isolated environments with their own working directories.

---

## Current State (v0.2.0)

### Architecture

```
<project-root>/
├── claude/
│   ├── alice/    # Full git clone
│   ├── betty/    # Full git clone
│   └── felix/    # Full git clone
└── .gitignore    # Contains "claude/"
```

### How It Works

1. User runs `claudectl spawn 3` in a git repository
2. claudectl creates `claude/` directory in project root
3. For each agent:
   - If existing directory: `git fetch && reset --hard` (fast)
   - If new: `git clone` the entire repository (slow)
4. Launches terminal tabs (Kitty/iTerm) with Claude Code in each directory
5. Each Claude instance works independently

### Limitations

- **Disk space**: Full clones duplicate entire repo history per agent
- **Clone time**: Initial spawns are slow for large repos
- **No coordination**: Agents work in isolation, no shared task queue
- **Tab switching**: User must manually switch tabs to interact with agents

---

## Proposed Improvements

### 1. Git Worktrees

**Problem**: Cloning creates duplicate `.git` directories, wasting disk space and time.

**Solution**: Use git worktrees to share a single `.git` directory across all agent working directories.

```
~/.claudectl/
├── repos/
│   └── <repo-hash>/
│       ├── .git/              # Shared git directory (bare)
│       └── worktrees/
│           ├── alice/         # Worktree (lightweight)
│           ├── betty/         # Worktree (lightweight)
│           └── felix/         # Worktree (lightweight)
├── queues/                    # Task queues (Phase 2)
├── ipc/                       # Agent communication (Phase 3)
└── config.json                # Global claudectl config
```

**Benefits**:

- Single `.git` directory shared across all worktrees
- Near-instant agent creation (no network, no clone)
- Agents can work on different branches simultaneously
- Central location keeps project directories clean
- Works from any directory (agents tied to repo, not cwd)

**Commands**:

```bash
# Create worktree
git worktree add ../worktrees/alice -b alice-work

# List worktrees
git worktree list

# Remove worktree
git worktree remove alice
```

**Repo identification**: Hash the remote URL to create a unique identifier for each repository. This allows spawning agents for the same repo from different local clones.

**Migration**: Existing `claude/` directories will be deprecated. Users can manually clean them up after upgrading.

---

### 2. Task Queue / Scratchpad

**Problem**: No way to queue tasks for agents. User must manually assign work and track completion.

**Solution**: A persistent task queue that agents can pull from.

#### Data Model

```typescript
interface Task {
  id: string;
  prompt: string; // The task description/prompt
  status: "queued" | "assigned" | "in_progress" | "completed" | "failed";
  assignedTo?: string; // Agent name
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: string; // Output/summary from agent
  priority: number; // Lower = higher priority
}

interface TaskQueue {
  tasks: Task[];
  history: Task[]; // Completed/failed tasks
}
```

#### Storage

```
~/.claudectl/
└── queues/
    └── <repo-hash>.json       # Task queue per repository
```

#### Commands

```bash
# Add task to queue
claudectl add "Fix the authentication bug in src/auth.ts"
claudectl add "Write tests for the user module" --priority 1

# View queue
claudectl queue              # Show pending tasks
claudectl queue --all        # Include completed

# Assign next task to available agent
claudectl dispatch alice     # Manually assign to alice
claudectl dispatch --auto    # Auto-assign to first idle agent
```

#### Workflow

1. User adds tasks via `claudectl add "..."`
2. Tasks enter queue with status `queued`
3. When agent becomes available:
   - `claudectl dispatch` sends task to agent
   - Task status becomes `assigned`
4. Agent picks up task (via MCP or file watcher)
5. On completion, agent reports back
6. Task moves to history

---

### 3. Agent Communication (Command Passthrough)

**Problem**: To interact with agents, user must switch terminal tabs. Notifications require tab-switching.

**Solution**: claudectl acts as a control plane, sending commands to agents and receiving notifications.

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      claudectl (control plane)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Task Queue  │  │  Agent Mgr  │  │  Notif Hub  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└────────────────────────┬────────────────────────────────────┘
                         │ IPC (Unix sockets / named pipes)
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │    alice    │ │    betty    │ │    felix    │
    │  (Claude)   │ │  (Claude)   │ │  (Claude)   │
    └─────────────┘ └─────────────┘ └─────────────┘
```

#### Communication Methods

**Option A: MCP Server (Preferred)**

claudectl runs an MCP server that Claude Code instances connect to:

```typescript
// MCP tools exposed to agents
interface ClaudectlMCP {
  // Agent reports status
  reportStatus(status: "idle" | "working" | "blocked"): void;

  // Agent requests next task
  getNextTask(): Task | null;

  // Agent completes task
  completeTask(taskId: string, result: string): void;

  // Agent needs human input
  requestHumanInput(question: string): Promise<string>;

  // Agent sends notification
  notify(message: string, level: "info" | "warning" | "error"): void;
}
```

**Option B: File-based IPC**

Simpler but less real-time:

```
~/.claudectl/
└── ipc/
    └── <repo-hash>/
        ├── alice/
        │   ├── status.json     # Agent writes status
        │   ├── inbox.json      # claudectl writes commands
        │   └── outbox.json     # Agent writes responses
        └── betty/
            └── ...
```

#### Commands

```bash
# View all agents and their status
claudectl status

# Send command to specific agent
claudectl tell alice "pause current work and prioritize the auth bug"

# Broadcast to all agents
claudectl broadcast "stop work, we're merging main"

# View pending notifications from agents
claudectl notifications

# Respond to agent question
claudectl respond alice "yes, use JWT tokens"

# Interactive mode - unified view of all agents
claudectl monitor
```

#### Monitor Mode

A persistent TUI showing all agents:

```
┌─ claudectl monitor ──────────────────────────────────────────┐
│                                                              │
│  Agents                          Notifications               │
│  ────────                        ─────────────               │
│  [alice] Working on auth.ts      ! alice needs input         │
│  [betty] Idle                      "Should I add logging?"   │
│  [felix] Writing tests                                       │
│                                                              │
│  Task Queue (3 pending)                                      │
│  ──────────────────────                                      │
│  1. Fix auth bug           → alice                           │
│  2. Write user tests       (queued)                          │
│  3. Update README          (queued)                          │
│                                                              │
│  [a]dd task  [d]ispatch  [r]espond  [q]uit                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Git Worktrees

- Implement worktree creation/management in `src/lib/git.ts`
- Create `~/.claudectl/` directory structure
- Add repo hashing utility (hash remote URL)
- Rewrite spawn command to use worktrees exclusively
- Remove `claude/` directory support entirely
- Update `--clean` flag to remove and recreate worktrees

### Phase 2: Task Queue

- Create `src/lib/queue.ts` with task data model
- Add `claudectl add` command
- Add `claudectl queue` command
- Add `claudectl dispatch` command
- Persist queue to `~/.claudectl/queues/`

### Phase 3: Agent Communication

- Design IPC protocol (MCP vs file-based)
- Create `src/lib/ipc.ts` for agent communication
- Add `claudectl status` command
- Add `claudectl tell` command
- Add `claudectl notifications` command

### Phase 4: Monitor Mode

- Create `src/commands/monitor.tsx`
- Unified TUI with agent status, queue, notifications
- Real-time updates via IPC
- Keyboard shortcuts for common actions

---

## Open Questions

1. **MCP vs File IPC**: MCP is cleaner but requires Claude Code to support custom MCP servers per-session. File-based is simpler to implement but has latency.

2. **Branch strategy with worktrees**: Should each agent auto-create a branch? How to handle merge conflicts when agents work on same files?

3. **Task format**: Plain text prompts, or structured with file hints, context, acceptance criteria?

4. **Notification priority**: How to surface urgent agent questions without being intrusive?

5. **Multi-repo support**: Should claudectl support orchestrating agents across multiple repositories?

---

## References

- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
