# Project Template Structure Research

**Date**: 2026-01-21
**Researcher**: Claude + User
**Status**: Complete

## Question/Goal

What's the best way to maintain project context across Claude sessions for projects going from research through planning to development?

## Methodology

- Discussed with user about project management patterns
- Reviewed common practices in AI-assisted development
- Considered scalability concerns for long-running projects
- Evaluated different documentation approaches

## Key Findings

### Finding 1: CLAUDE.md as Convention
CLAUDE.md is emerging as a convention for Claude-specific guidance and project structure documentation. It serves as the entry point for Claude to understand project conventions.

### Finding 2: Filesystem-Based Documentation
Filesystem-based documentation works well with version control and provides:
- Searchable history
- Portable context
- No external dependencies
- Integration with standard development workflows

### Finding 3: Individual Files Scale Better
Using individual files for decisions and findings (rather than appending to monolithic files) provides:
- Better performance for large projects
- Selective reading capabilities
- Clearer git history
- Easier to find specific information

### Finding 4: Three-Tier Structure
Separation between research, planning, and implementation helps maintain clarity:
- `.research/` - Exploratory findings and references
- `.planning/` - Decisions and roadmap based on research
- `src/` - Implementation

## Evidence/Examples

Common ADR (Architecture Decision Record) patterns use individual files:
```
decisions/
├── 0001-use-postgresql.md
├── 0002-implement-caching.md
└── INDEX.md
```

This pattern is widely adopted in the software industry for exactly the scalability reasons we identified.

## Implications for Our Project

- Need to create template with both CLAUDE.md and structured directories
- Should use individual files for decisions and findings from the start
- INDEX.md files help with discoverability
- progress.md can remain as single file since it's regularly pruned/archived

## Recommendations

1. Create CLAUDE.md with comprehensive guidelines
2. Use individual files for decisions (ADR pattern)
3. Use individual files for research findings
4. Maintain INDEX.md files for quick reference
5. Keep progress.md as single file but archive old entries periodically

## Open Questions

- How often should progress.md be archived?
- Should we use numbered prefixes (0001-) or date prefixes (YYYY-MM-DD-)?
  - **Decision**: Use date prefixes for better chronological scanning

## Sources

- Architecture Decision Records pattern (industry standard)
- Discussion with user about scalability concerns
- Common practices in AI-assisted development

## Related

- Decision: [../../.planning/decisions/2026-01-21-project-structure.md](../../.planning/decisions/2026-01-21-project-structure.md)
