# AI Project Template

A structured template for building projects with Claude from research through development, with built-in progress tracking and decision logging.

## What This Template Provides

- **Organized structure** for research, planning, and development
- **CLAUDE.md** - Guidelines for Claude to follow project conventions
- **Progress tracking** - Keep context across sessions
- **Decision logging** - Document architectural choices with rationale
- **Research repository** - Collect findings and references

## Quick Start

### For New Projects

1. **Copy this template**:
   ```bash
   cp -r ai-project-template my-new-project
   cd my-new-project
   ```

2. **Initialize git**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit from AI project template"
   ```

3. **Update the README** with your project details (replace this content)

4. **Start your first Claude session**:
   - Tell Claude: "Read CLAUDE.md and help me get started"
   - Define your project goals
   - Begin research or planning phase

### Working with Claude

**Start of each session**:
```
Read CLAUDE.md and .planning/progress.md to catch up on the project
```

Claude will then understand:
- Where files are organized
- What conventions to follow
- Current project status
- What to work on next

## Project Structure

```
project/
├── CLAUDE.md           # Guidelines for Claude (read this first!)
├── README.md           # This file - project overview
├── .research/          # Research findings and references
│   ├── findings.md     # Key discoveries
│   └── references.md   # Links and resources
├── .planning/          # Planning and decision logs
│   ├── progress.md     # Current status (updated frequently)
│   ├── decisions.md    # Architecture decisions
│   └── roadmap.md      # High-level plan
├── docs/               # User-facing documentation
├── src/                # Source code
└── tests/              # Test files
```

## Workflow

### 1. Research Phase
- Document findings in `.research/findings.md`
- Collect references in `.research/references.md`
- Update progress in `.planning/progress.md`

### 2. Planning Phase
- Make architectural decisions, document in `.planning/decisions.md`
- Create roadmap in `.planning/roadmap.md`
- Continue updating progress

### 3. Development Phase
- Implement features in `src/`
- Write tests in `tests/`
- Document in `docs/`
- Log important implementation decisions
- Keep progress.md current

### 4. Maintenance
- All decisions and context are version controlled
- Easy to onboard new collaborators (including Claude in new sessions)
- Searchable history of why things were done certain ways

## Key Files

### CLAUDE.md
The most important file for AI collaboration. Contains:
- Project structure explanation
- Conventions to follow
- Session workflow
- Documentation standards

**Always direct Claude to read this file first.**

### .planning/progress.md
The "source of truth" for current status:
- What's completed
- What's in progress
- Next steps
- Blockers

**Update this at the end of every session.**

### .planning/decisions.md
Architecture Decision Records (ADRs):
- Context for each decision
- What was decided
- Why it was decided
- Alternatives considered
- Consequences

**Add entries whenever making significant technical choices.**

## Tips for Success

1. **Build the habit**: Start each Claude session by having it read CLAUDE.md and progress.md
2. **Keep progress current**: Update .planning/progress.md at the end of each session
3. **Document decisions**: Don't let important choices go undocumented
4. **Commit frequently**: Git history is your friend
5. **Adapt as needed**: Modify conventions to fit your project's needs

## Customization

This template is a starting point. Feel free to:
- Add project-specific sections to CLAUDE.md
- Create additional files in `.planning/` or `.research/`
- Adjust the directory structure for your needs
- Add your own conventions

## Why This Works

- **Version controlled**: All context lives with your code
- **Searchable**: Use git history and grep to find past decisions
- **Portable**: No external dependencies
- **Scalable**: Works for small experiments or large projects
- **AI-friendly**: Claude can read and update all documentation

---

## Working with Claude

Claude: Start by reading `CLAUDE.md` for complete project guidelines and conventions.
