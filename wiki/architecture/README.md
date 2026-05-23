# Architecture

Canonical rules for code in `src/`. Read on demand from `AGENTS.md` and from any skill that loads an architecture page.

## Pages

| Page | Covers |
|---|---|
| [app-structure](app-structure.md) | Next.js App Router layout — which surface owns which route, where chrome is mounted, server vs client components |
| [stores](stores.md) | Zustand stores (`useConfiguratorStore`, `useAuthStore`) — what each owns, hydration rules, derived selectors |
| [data-model](data-model.md) | PocketBase collections (`CharacterStudioCharacters`, voices, users) and the asset/S3 contract |
| [creating-rules](creating-rules.md) | How to add or update a page in this folder |

## Reading order for a review

1. [app-structure](app-structure.md) — always; defines layer ownership.
2. [stores](stores.md) — any change touching client state.
3. [data-model](data-model.md) — any change touching PB or S3.

Other pages on demand. Add a new page **after** the same mistake has been made twice — not pre-emptively (see [creating-rules](creating-rules.md)).
