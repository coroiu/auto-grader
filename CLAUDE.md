# Claude Project Guide

**IMPORTANT**: Read this file at the start of each session to understand project structure and conventions.

## Quick Start for Claude

1. Read `.planning/progress.md` to see current status
2. Review `.planning/decisions/INDEX.md` to find relevant architectural decisions
3. Read specific decision files as needed from `.planning/decisions/`
4. Check `.research/findings/INDEX.md` for research findings relevant to current work
5. Follow the conventions below when working on this project

## Project Structure

```
project/
├── CLAUDE.md           # This file - guidelines for Claude
├── README.md           # Project overview and setup instructions
├── .research/          # Research findings, references, investigations
│   ├── findings/       # Individual research finding files
│   │   ├── INDEX.md    # Quick reference of all findings
│   │   └── YYYY-MM-DD-topic.md
│   └── references.md   # Links, papers, and external resources
├── .planning/          # Planning documents and decision logs
│   ├── decisions/      # Individual decision files (ADRs)
│   │   ├── INDEX.md    # Quick reference of all decisions
│   │   └── YYYY-MM-DD-decision.md
│   ├── progress.md     # Current status and next steps
│   └── roadmap.md      # High-level project roadmap
├── docs/               # User-facing documentation
├── src/                # Source code
└── tests/              # Test files
```

## Conventions

### File Organization
- **Keep research separate from planning**: Research findings go in `.research/findings/`, decisions based on that research go in `.planning/decisions/`
- **One file per decision/finding**: Use individual files for scalability and selective reading
- **Use date prefixes**: Name files as `YYYY-MM-DD-short-title.md` for chronological ordering
- **Maintain INDEX files**: Update `.planning/decisions/INDEX.md` and `.research/findings/INDEX.md` when adding new files
- **Progress tracking**: Always update `.planning/progress.md` at the end of each session

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
3. Review `.planning/decisions/INDEX.md` to identify relevant decisions
4. Read specific decision or finding files as needed
5. Continue from the "Next Steps" section

### During a Session
1. Use TodoWrite tool to track multi-step tasks
2. Document new decisions by creating files in `.planning/decisions/` and updating INDEX.md
3. Document new research by creating files in `.research/findings/` and updating INDEX.md
4. Only read the specific decision/finding files you need (don't read all of them)

### Ending a Session
1. Update `.planning/progress.md`:
   - What was completed
   - What's in progress
   - Next steps
   - Any blockers or questions
2. Commit changes with descriptive message
3. Ensure all decisions are documented

## Decision Log Format

When creating a new decision file in `.planning/decisions/`:

1. Create file: `.planning/decisions/YYYY-MM-DD-short-title.md`
2. Use this format:

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

## Consequences

### Positive
- Benefit 1

### Negative
- Trade-off 1

## References

- [Relevant link](URL)
- Related decisions: [2026-01-15-other-decision.md](2026-01-15-other-decision.md)
```

3. Update `.planning/decisions/INDEX.md` with a new row

## Research Findings Format

When creating a new research finding in `.research/findings/`:

1. Create file: `.research/findings/YYYY-MM-DD-topic.md`
2. Use this format:

```markdown
# [Research Topic]

**Date**: YYYY-MM-DD
**Researcher**: [Name or "Claude + User"]
**Status**: [In Progress | Complete | Needs Follow-up]

## Question/Goal

What were we trying to understand or discover?

## Key Findings

### Finding 1: [Title]
Description and why it matters.

## Implications for Our Project

How do these findings affect our decisions?

## Recommendations

Based on this research, what should we do?

## Sources

- [Source name](URL)
```

3. Update `.research/findings/INDEX.md` with a new row

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

### Auto Grader Overview

Auto Grader is a photography workflow automation tool that:
1. Watches for new RAW files (Sony ARW) uploaded via FTP
2. Converts RAW files using darktable-cli
3. Applies LUTs (.cube files) to generate multiple graded JPGs per photo
4. Provides a gallery UI to browse and compare graded outputs

### Key Architecture Decisions

- **Single Docker container** - Worker runs in same process as Next.js
- **Filesystem-based state** - No database; state derived from file existence
- **p-queue** - In-memory job queue with filesystem crash recovery

See `.planning/decisions/2026-01-27-auto-grader-architecture.md` for full details.

### Directory Layout

```
src/
├── app/                    # Next.js App Router pages and API routes
├── components/             # React components
└── lib/
    └── processing/         # Core processing logic
        ├── pipeline.ts     # Orchestrates RAW→TIFF→JPG workflow
        ├── watcher.ts      # chokidar file watcher
        ├── state.ts        # Filesystem state utilities
        ├── raw.ts          # darktable-cli wrapper
        └── lut.ts          # FFmpeg LUT application

data/                       # Mounted volumes (gitignored)
├── inbox/                  # RAW files arrive here
├── output/                 # Graded JPGs (organized by photo)
└── luts/                   # .cube files
```

### Processing State Detection

```
/data/output/DSC00123/
├── .processing           # Marker: processing in progress
├── metadata.json         # EXIF data
├── thumb.jpg             # Gallery thumbnail
├── original.jpg          # No LUT applied
├── cinematic.jpg         # Named after LUT
└── vintage.jpg           # Named after LUT
```

- Photo is **pending**: folder doesn't exist or `.processing` marker present
- Photo is **complete**: folder exists with all expected JPGs
- Photo needs **partial processing**: folder exists but missing some LUT outputs

### Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript check
docker-compose up    # Run with Docker
```

### Testing Locally Without Docker

For local development without Docker, you'll need:
- darktable-cli installed (`brew install darktable` on macOS)
- FFmpeg installed (`brew install ffmpeg`)
- exiftool installed (`brew install exiftool`)

Set `DATA_DIR=./data` in `.env.local` to use local data directory.
