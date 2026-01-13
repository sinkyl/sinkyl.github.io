# ADR 0001: Automated Devlog Generation

## Status
Accepted

## Context
We want to maintain a technical blog that documents weekly progress, technologies used, and learnings. Manual blog writing is time-consuming and often gets deprioritized.

## Decision
Implement an automated devlog system where:

1. **Daily commits** follow a structured "blog-aware" format with metadata trailers
2. **Weekly generation** collects commits and uses AI to generate a blog post
3. **Local-first workflow** - all generation happens locally before pushing
4. **Human review** - posts are reviewed before committing

## Consequences

### Positive
- Consistent documentation of progress
- Structured commit messages improve git history
- Educational content generated automatically
- No confidential information leaks (explicit controls)

### Negative
- Overhead of writing structured commits
- Dependency on AI model availability for generation
- Need to review generated content for accuracy

## Implementation
- Astro for static site generation
- GitHub Pages for hosting
- Local scripts for commit collection and post generation
- Prompt files version-controlled in repo
