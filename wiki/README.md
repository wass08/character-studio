# Wiki

How `character-studio` works **today**. Forward-looking work lives in [`plans/`](../plans/README.md); this directory is read-on-demand reference once a behavior has shipped and stabilised.

## Sections

| Folder | Covers |
|---|---|
| [`architecture/`](architecture/README.md) | Canonical rules for layered surfaces — route structure, data model, stores, scene/R3F integration, asset pipeline. Read before touching the corresponding code. |

New sections (e.g. `ops/`, `ui/`, `contributing/`) get created the first time a topic outgrows a single page. Don't pre-create empty folders.

## How this fits with `plans/`

- [`plans/README.md`](../plans/README.md) — what we are building or have decided to defer. Active charters live here.
- [`wiki/architecture/`](architecture/README.md) — the rules a finished plan promoted into canon.

When a plan ships, the durable "how it works now" gets copied/updated here in the **same commit** (see [`update-wiki-from-plan`](../.agents/skills/update-wiki-from-plan/SKILL.md)). The plan stays as the history of how it got built.
