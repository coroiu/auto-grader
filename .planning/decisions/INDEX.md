# Architecture Decision Records (ADRs)

This directory contains individual decision records. Each file documents one significant architectural or design decision.

## Quick Reference

| Date | Decision | Status | File |
|------|----------|--------|------|
| 2026-01-21 | Project structure and documentation system | Accepted | [2026-01-21-project-structure.md](2026-01-21-project-structure.md) |

## How to Add New Decisions

1. **Create a new file**: `YYYY-MM-DD-short-title.md`
2. **Use the template** below
3. **Update this INDEX.md** with a new row
4. **Commit both files** together

## Decision Template

```markdown
# [Decision Title]

**Date**: YYYY-MM-DD
**Status**: [Proposed | Accepted | Deprecated | Superseded]

## Context

Why does this decision need to be made? What's the background?

## Decision

What are we doing?

## Rationale

Why is this the best choice?

## Alternatives Considered

What other options did we evaluate?

- **Option 1**: Description
  - Pros: ...
  - Cons: ...
- **Option 2**: Description
  - Pros: ...
  - Cons: ...

## Consequences

What are the implications of this decision?

### Positive
- Benefit 1
- Benefit 2

### Negative
- Trade-off 1
- Trade-off 2

## References

- [Relevant link](URL)
- Related decisions: [2026-01-15-other-decision.md](2026-01-15-other-decision.md)

## Notes

Any additional context or follow-up items.
```

## Status Meanings

- **Proposed**: Under consideration, not yet implemented
- **Accepted**: Decision made and being/been implemented
- **Deprecated**: No longer relevant but kept for historical context
- **Superseded**: Replaced by a newer decision (link to it)

## Tips

- One decision per file keeps things focused and git-friendly
- Use descriptive filenames: `2026-01-21-choose-postgres-over-mongodb.md`
- Update status as decisions evolve
- Link related decisions to each other
- It's okay to have short decision records for simple choices
