# sinkyl Devlog

Automated weekly devlog powered by AI-generated commits and Astro.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## How It Works

1. **Daily**: Write commits using the [blog-aware format](docs/commit-spec.md)
2. **Weekly**: Run the post generator to create a draft
3. **Review**: Edit the generated post
4. **Publish**: Commit and push to deploy

## Weekly Post Generation (Local)

### Step 1: Collect commits from your project

```bash
# From your project directory
cd /path/to/your/project
/path/to/blog/scripts/devlog/collect_commits.sh . 7
```

Or specify a repo path:
```bash
./scripts/devlog/collect_commits.sh ~/projects/my-project 7
```

### Step 2: Generate the prompt

```bash
node scripts/devlog/generate_weekly_post.js /path/to/your/project
```

This outputs a complete prompt to paste into Claude or ChatGPT.

### Step 3: Create the post

1. Copy the generated prompt
2. Paste into Claude or ChatGPT
3. Copy the AI's response
4. Save to `src/content/blog/YYYY-MM-DD-weekly-progress.md`
5. Review and edit
6. Remove `draft: true` from frontmatter
7. Commit and push

## Commit Message Format

See [docs/commit-spec.md](docs/commit-spec.md) for the full specification.

Quick example:
```
feat(graph): implement cross-context port wiring

Context: ContextNode pan-out needed external ports
Why: Enable composable graph structures
Impact: Users can wire nodes across boundaries
Validation: Unit tests, manual demo

Blog-Intent: highlight
Blog-Audience: devs
Blog-Summary: Added cross-context wiring for modular graph composition.
Tech-Lang: Rust, TypeScript
Tech-Patterns: Observer, Mediator
Tech-Arch: Actor model
Pros: Clean boundaries, Testable
Cons: Cross-boundary overhead
Refs: https://doc.rust-lang.org/book/ch16-02-message-passing.html
Confidentiality: public
```

## Using Claude for Commits

The commit writer prompt is in `scripts/commit/commit_writer.prompt.txt`.

You can:
1. Copy the prompt and paste it into Claude before describing your changes
2. Set it as a custom instruction in your AI tool
3. Create a script/alias that includes it automatically

## Project Structure

```
blog/
├── .github/workflows/    # GitHub Actions (deploy)
├── docs/                 # Commit spec, ADRs
├── scripts/
│   ├── commit/           # Commit writer prompts
│   └── devlog/           # Weekly post generation
├── src/
│   ├── content/blog/     # Blog posts (Markdown)
│   ├── layouts/          # Astro layouts
│   ├── pages/            # Astro pages
│   └── styles/           # Global CSS
└── public/               # Static assets
```

## Deployment

Push to `main` branch triggers automatic deployment to GitHub Pages via GitHub Actions.

### First-time setup

1. Go to repo Settings → Pages
2. Set Source to "GitHub Actions"
3. Push to main

## Configuration

Edit `astro.config.mjs`:
- Update `site` to your GitHub Pages URL
- Uncomment `base` if using a repo name other than `username.github.io`
