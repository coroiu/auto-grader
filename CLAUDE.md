# Claude Project Guide

**IMPORTANT**: Read this file at the start of each session to understand project structure and conventions.

## Quick Start for Claude

1. Read `.planning/progress.md` to see current status
2. Review `.planning/decisions.md` for past architectural decisions
3. Check `.research/` for any research findings relevant to current work
4. Follow the conventions below when working on this project

## Project Structure

```
project/
├── CLAUDE.md           # This file - guidelines for Claude
├── README.md           # Project overview and setup instructions
├── .research/          # Research findings, references, investigations
│   ├── findings.md     # Key research discoveries
│   └── references.md   # Links, papers, and external resources
├── .planning/          # Planning documents and decision logs
│   ├── progress.md     # Current status and next steps
│   ├── decisions.md    # Architecture and design decisions
│   └── roadmap.md      # High-level project roadmap
├── docs/               # User-facing documentation
├── src/                # Source code
└── tests/              # Test files
```

## Conventions

### File Organization
- **Keep research separate from planning**: Research findings go in `.research/`, decisions based on that research go in `.planning/decisions.md`
- **Progress tracking**: Always update `.planning/progress.md` at the end of each session
- **Decision logging**: Document important decisions in `.planning/decisions.md` with date, context, decision, and rationale

### Documentation Standards
- Use clear headers and bullet points
- Include dates for entries (YYYY-MM-DD format)
- Link to relevant files using relative paths
- Use code blocks with language tags for code snippets

### Git Practices
- Write descriptive commit messages
- Reference decision logs in commits when implementing architectural choices
- Commit planning documents as they evolve

### Code Practices
- Follow existing patterns in the codebase
- Document "why" not "what" in code comments
- Keep solutions simple and focused on current requirements
- Avoid over-engineering and premature abstractions

## Session Workflow

### Starting a Session
1. Read `.planning/progress.md`
2. Check for any blockers or open questions
3. Review relevant sections of `.planning/decisions.md`
4. Continue from the "Next Steps" section

### During a Session
1. Use TodoWrite tool to track multi-step tasks
2. Document new decisions in `.planning/decisions.md` as they're made
3. Update research findings in `.research/` if discovering new information

### Ending a Session
1. Update `.planning/progress.md`:
   - What was completed
   - What's in progress
   - Next steps
   - Any blockers or questions
2. Commit changes with descriptive message
3. Ensure all decisions are documented

## Decision Log Format

When adding to `.planning/decisions.md`:

```markdown
## [YYYY-MM-DD] Decision Title

**Context**: Why did this decision need to be made?

**Decision**: What was decided?

**Rationale**: Why was this the best choice?

**Alternatives Considered**: What other options were evaluated?

**Consequences**: What are the implications of this decision?
```

## Progress Log Format

`.planning/progress.md` should always have:

```markdown
# Project Progress

**Last Updated**: YYYY-MM-DD

## Current Status
[Brief summary of where the project is]

## Completed
- [List of completed items with dates]

## In Progress
- [What's currently being worked on]

## Next Steps
- [Prioritized list of what to do next]

## Blockers
- [Any blockers or open questions]
```

## Tips for Effective Collaboration

- **Be explicit about uncertainty**: If you're unsure about an approach, document it and ask
- **Link context**: Reference file paths and line numbers when discussing code
- **Summarize changes**: At the end of work, summarize what changed and why
- **Preserve history**: Don't delete old sections in planning docs, just mark them as completed or superseded

## Project-Specific Notes

[Add any project-specific conventions, preferences, or context here as the project evolves]

---

**Remember**: This template is a starting point. Adapt these conventions as you learn what works best for this specific project.
