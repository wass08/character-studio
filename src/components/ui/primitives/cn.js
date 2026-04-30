export const cn = (...args) =>
  args
    .flat()
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
