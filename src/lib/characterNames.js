// Playful default names for characters nobody bothered to name. Client and
// server safe (no imports). Used by the embed's Done button, the editor's
// save prompt and the embed API's fallback, so a character never ships as
// "Untitled" or "My character".

const ADJECTIVES = [
  "Sleepy",
  "Caffeinated",
  "Majestic",
  "Suspicious",
  "Wobbly",
  "Dramatic",
  "Turbo",
  "Cosmic",
  "Grumpy",
  "Dapper",
  "Mysterious",
  "Sparkly",
  "Feral",
  "Legendary",
  "Tiny",
  "Gigantic",
  "Spicy",
  "Chaotic",
  "Unbothered",
  "Fancy",
  "Rogue",
  "Squeaky",
  "Moonlit",
  "Radioactive",
  "Velvet",
  "Crispy",
  "Invisible",
  "Sassy",
  "Nocturnal",
  "Pixelated",
];

const NOUNS = [
  "Pancake",
  "Raccoon",
  "Wizard",
  "Cactus",
  "Pirate",
  "Noodle",
  "Penguin",
  "Baguette",
  "Ninja",
  "Potato",
  "Llama",
  "Astronaut",
  "Muffin",
  "Goblin",
  "Otter",
  "Dumpling",
  "Sorcerer",
  "Waffle",
  "Capybara",
  "Viking",
  "Taco",
  "Hamster",
  "Knight",
  "Pickle",
  "Yeti",
  "Burrito",
  "Detective",
  "Marshmallow",
  "Ghost",
  "Cowboy",
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** e.g. "Suspicious Pancake", "Turbo Capybara". */
export function randomCharacterName() {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}

export const CHARACTER_NAME_PLACEHOLDER = "Name your character";
