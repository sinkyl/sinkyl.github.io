# Blog-Aware Commit Specification

This document defines the commit message format used for automated weekly devlog generation.

## Commit Subject (Conventional Commits)

```
<type>(<scope>): <imperative summary>
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `docs` - Documentation changes
- `chore` - Maintenance tasks
- `style` - Code style changes (formatting, etc.)

### Examples
```
feat(graph): add external-port panout view
fix(runtime): prevent deadlock in tick scheduler
refactor(ui): split renderer into passes
perf(engine): optimize node traversal with spatial indexing
```

## Commit Body

Keep it structured and concise:

```
Context: <what was the situation>
Why: <why this change was needed>
Impact: <what this enables or changes>
Validation: <how it was tested>
```

## Trailers (Required for Blog Generation)

Add these at the end of the commit message, one per line:

### Required Trailers

| Trailer | Values | Description |
|---------|--------|-------------|
| `Blog-Intent` | `highlight` \| `normal` \| `skip` | How prominent in the weekly post |
| `Blog-Audience` | `devs` \| `advanced` \| `mixed` | Target reader level |
| `Blog-Summary` | 1-2 sentences | Human-readable summary for the post |
| `Tech-Lang` | comma-separated | Languages used (Rust, TypeScript, Python, etc.) |
| `Tech-Patterns` | comma-separated | Design patterns (CQRS, ECS, Observer, etc.) |
| `Tech-Arch` | comma-separated | Architectural approaches (Hexagonal, Actor model, etc.) |
| `Pros` | comma-separated | Benefits of the approach |
| `Cons` | comma-separated | Drawbacks or trade-offs |
| `Refs` | URLs, comma-separated | Links to docs/articles (no secrets) |

### Safety Trailers

| Trailer | Values | Description |
|---------|--------|-------------|
| `Confidentiality` | `public` \| `redact` \| `skip` | How to handle in blog |
| `Redact-Notes` | text | What to avoid mentioning if `redact` |

### Optional Trailers

| Trailer | Values | Description |
|---------|--------|-------------|
| `Diagram` | `none` \| `mermaid` \| `png` | Whether a diagram should be included |
| `Mermaid` | code or path | Mermaid diagram code or file reference |
| `Docs-Add` | paths | Internal docs to reference |

## Full Example

```
feat(graph): implement port-to-port data forwarding

Context: ContextNode pan-out needed external ports for cross-context wiring
Why: Enable composable graph structures with clean boundaries
Impact: Users can now wire nodes across context boundaries seamlessly
Validation: Unit tests for PortShare, manual test in demo graph

Blog-Intent: highlight
Blog-Audience: devs
Blog-Summary: Added cross-context port wiring, enabling modular graph composition with clean data flow boundaries.
Tech-Lang: Rust, TypeScript
Tech-Patterns: Observer, Mediator
Tech-Arch: Actor model, Message passing
Pros: Clean boundaries, Testable isolation, Reusable contexts
Cons: Slight overhead for cross-boundary calls, More complex debugging
Refs: https://doc.rust-lang.org/book/ch16-02-message-passing.html
Confidentiality: public
Diagram: mermaid
Mermaid: graph LR; A[Context A] -->|Port| B[Context B]
```

## Quick Reference for Trailers

Copy this template when writing commits:

```
Blog-Intent: normal
Blog-Audience: devs
Blog-Summary:
Tech-Lang:
Tech-Patterns:
Tech-Arch:
Pros:
Cons:
Refs:
Confidentiality: public
```

## Commits to Skip

For trivial commits that shouldn't appear in the blog:
- Set `Blog-Intent: skip`
- Or set `Confidentiality: skip`

Examples of commits to skip:
- Version bumps
- Typo fixes
- Dependency updates (unless significant)
- Merge commits
