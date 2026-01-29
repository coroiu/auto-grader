# Architecture Decision Records (ADRs)

This directory contains individual decision records. Each file documents one significant architectural or design decision.

## Quick Reference

| Date | Decision | Status | File |
|------|----------|--------|------|
| 2026-01-29 | Filmic exposure tone mapping for realistic highlight/shadow behavior | Accepted | [2026-01-29-filmic-exposure-tone-mapping.md](2026-01-29-filmic-exposure-tone-mapping.md) |
| 2026-01-28 | Browser-based image editing with WebGL | Accepted | [2026-01-28-browser-based-image-editing.md](2026-01-28-browser-based-image-editing.md) |
| 2026-01-28 | Gallery performance optimization (in-memory store, virtual scroll) | Accepted | [2026-01-28-gallery-performance-optimization.md](2026-01-28-gallery-performance-optimization.md) |
| 2026-01-27 | Auto Grader architecture (single container, filesystem state) | Accepted | [2026-01-27-auto-grader-architecture.md](2026-01-27-auto-grader-architecture.md) |
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

## Consequences

### Positive
- Benefit 1

### Negative
- Trade-off 1

## References

- [Relevant link](URL)
```

## Status Meanings

- **Proposed**: Under consideration, not yet implemented
- **Accepted**: Decision made and being/been implemented
- **Deprecated**: No longer relevant but kept for historical context
- **Superseded**: Replaced by a newer decision (link to it)
