# character-studio

## Agent skills

Config block read by the engineering skills (`to-issues`, `triage`, `tdd`, `diagnose`, etc.).

- **Issue tracker:** GitHub Issues at [`wass08/character-studio`](https://github.com/wass08/character-studio/issues). Skills create/read via `gh issue ...`.
- **Triage labels** (role → label string):
  - `needs-triage` → `needs-triage`
  - `needs-info` → `needs-info`
  - `ready-for-agent` → `ready-for-agent`
  - `ready-for-human` → `ready-for-human`
  - `wontfix` → `wontfix`
- **Glossary:** `docs/agents/glossary.md`
- **ADRs:** `docs/adr/`

> Labels above must exist in the GitHub repo. If `gh label list` doesn't show them, create with `gh label create <name>`.
