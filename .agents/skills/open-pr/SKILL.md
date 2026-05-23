---
name: open-pr
description: Open a pull request from the current branch with a clean title, body, and test plan. Use when the user asks to open/create a PR, push and PR, or ship a branch.
allowed-tools: Bash(git *) Bash(gh *) Read
---

Open a pull request against `main` from the current branch.

## 1. Pre-flight

```bash
git status                 # confirm working tree state
git branch --show-current  # confirm we're on a feature branch, not main
git log --oneline main..HEAD
```

Stop if:

- The current branch is `main`. Ask the user to create a feature branch first.
- The branch has no commits ahead of `main`. Nothing to open a PR for.
- There are uncommitted changes the user hasn't asked to commit.

Run a sanity check if the change is non-trivial:

```bash
bun lint
bun build
```

Don't open the PR with a broken build.

## 2. Confirm the wiki-sync contract

If the branch introduces or changes a route, store field, PB collection, S3 contract, or any rule that future agents will need to know about, the matching `plans/*.md` plan's `wiki_sync` block must be satisfied **before** this PR ships, or the work has to ship as a follow-up commit on the same branch.

```bash
rg -l "status: (verification|implemented)" plans/*.md
```

If a relevant plan has `wiki_sync.required: true` and `wiki_sync.done: false`, run the [`update-wiki-from-plan`](../update-wiki-from-plan/SKILL.md) skill first.

If there's no plan covering the change, decide whether one should exist (see [`start-plan`](../start-plan/SKILL.md)). Refactors and bug fixes with no rule change don't need one — proceed.

## 3. Compose the PR body

A repo PR template may exist later (`.github/pull_request_template.md`). If present, read it first and mirror the section headings verbatim. Otherwise use this default:

```markdown
## What does this PR do?

<one paragraph; link related plans with plans/<plan-id>.md when applicable>

## How to test

1. <step — commands, what to click, expected outcome>
2. <…>

## Wiki / plan updates

- Plan: <plans/<plan-id>.md> — status now `<status>`
- Wiki: <wiki/architecture/<page>.md> — <one-line summary of the rule added/sharpened>
- N/A — non-rule change

## Screenshots / screen recording

<link, or "N/A — non-visual change">

## Checklist

- [x] `bun lint` passes
- [x] `bun build` passes
- [ ] Wiki updated (or N/A explained above)
```

## 4. Push and open

```bash
git push -u origin HEAD
```

Check for an existing PR first:

```bash
gh pr view --json url 2>/dev/null
```

If none exists, create it with the body via HEREDOC to preserve markdown:

```bash
gh pr create --title "<short, scope-prefixed title>" --body "$(cat <<'EOF'
<body from step 3>
EOF
)"
```

Keep the title under ~70 characters. Use a scope prefix when there's an obvious one (`hub:`, `editor:`, `play:`, `admin:`, `data:`, `docs:`).

If a PR already exists, print its URL and stop — don't recreate.

## 5. Report

Return:

- PR URL
- Title used
- Local lint/build status (if you ran them)
- Plan(s) referenced and their wiki-sync state
- A note for the reviewer on anything left unchecked
