"use client";

import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

const MAX_LEN = 80;

/**
 * Character name input shown at the top of the editor's "Character" section,
 * above the gender toggle — the canonical place to (re)name the character.
 * Controlled straight off the store; typing marks the look dirty and flows
 * into the next Save (see saveCharacter / TopActions). Empty falls back to
 * "Untitled" at save time.
 */
const CharacterNameField = () => {
  const name = useConfiguratorStore((s) => s.currentCharacterName);
  const setCharacterName = useConfiguratorStore((s) => s.setCharacterName);

  return (
    <div className="shrink-0 max-md:w-[180px] md:w-full">
      <label
        htmlFor="character-name"
        className="mb-2 block px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65"
      >
        Name
      </label>
      <input
        id="character-name"
        type="text"
        value={name || ""}
        maxLength={MAX_LEN}
        onChange={(e) => setCharacterName(e.target.value)}
        placeholder="Name your character"
        className="w-full rounded-lg bg-black/15 px-3 py-2 text-sm font-medium tracking-tight text-white outline-none ring-1 ring-white/[0.08] transition-shadow placeholder:text-white/35 focus:ring-2 focus:ring-white/30"
      />
    </div>
  );
};

export default CharacterNameField;
