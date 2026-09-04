# Stores

## Character persistence

`useConfiguratorStore.saveCharacter` serializes the editable recipe into the
PocketBase character record. Alongside `customization`, `morphValues`, height,
gender, and pose, it must:

1. write every selected asset relation to `usedAssets`;
2. set `bakeStale` to `true`; and
3. call `enqueueCharacterBake` after the character record succeeds.

Bake enqueueing is best-effort and must not turn a successful character save
into a failure. The content-addressed worker makes repeated enqueue attempts
safe, while `dedupKey` prevents simultaneous queued/running duplicates.
