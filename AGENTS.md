<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Workflow

- Final verification order: `npx tsc --noEmit` → `npm run lint` (eslint + prettier formatting) → `npm run build`. Always run `npm run lint` before finishing work so files stay formatted.
- Commits: when the user says "commit the changes" (or similar), always include a changelog in the commit message — a bulleted body listing each concrete change (behavior, files, and rationale where relevant), mirroring the style of recent commits like `b805d3f`. Use `feat:`/`fix:`/`chore:` etc. prefix for the summary line.
