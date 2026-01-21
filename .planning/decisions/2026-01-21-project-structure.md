# Project Structure and Documentation System

**Date**: 2026-01-21
**Status**: Accepted

## Context

Need a consistent way to maintain project context and progress across multiple Claude sessions for projects going from research → planning → development. Long-running AI-assisted projects require a way to preserve decisions, track progress, and maintain context between sessions.

## Decision

Use filesystem-based documentation with CLAUDE.md as the guide and structured directories for research and planning artifacts. Use individual files for decisions and findings rather than appending to monolithic files.

## Rationale

- Version controlled alongside code
- Searchable and easily accessible
- No external dependencies required
- Works well with Claude's file reading capabilities
- Provides clear separation between research, planning, and implementation
- Individual files scale better than monolithic append-only documents
- Better git history with isolated changes
- Selective reading - Claude only reads relevant files

## Alternatives Considered

- **GitHub Issues only**: Works well but requires online access and GitHub setup. Less suitable for offline development.
  - Pros: Great for collaboration, built-in tracking
  - Cons: Requires GitHub, not version controlled locally

- **Single README.md**: Gets too cluttered for complex projects
  - Pros: Simple, everything in one place
  - Cons: Becomes unmanageable as project grows

- **External note-taking apps**: Context not version controlled with code
  - Pros: Rich features, good UX
  - Cons: Separate from codebase, not in version control

- **Monolithic decisions.md and findings.md files**: Initial approach
  - Pros: Simple to start
  - Cons: Becomes hard to read with many entries, poor scalability

## Consequences

### Positive
- Documentation lives with code, making it portable and version controlled
- Scales well for projects with many decisions and findings
- Easy to find specific decisions or research
- Clear git history for each decision

### Negative
- Need to develop habit of reading progress.md at session start
- Requires discipline to keep documentation updated
- Slightly more overhead to create new files vs appending
- Need to maintain INDEX.md files

## References

- Architecture Decision Records (ADR) pattern: Common industry practice
- Discussion with user about scalability concerns

## Notes

This is a living template. As we use it on real projects, we may discover improvements and adjust the structure accordingly.
