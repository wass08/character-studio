const GENERATED_USERNAME_RE = /^users?\d+$/i;

const clean = (value) => (typeof value === "string" ? value.trim() : "");

export const normalizeDisplayUsername = (value) =>
  clean(value).replace(/\s+/g, " ");

export const isGeneratedUsername = (value) =>
  GENERATED_USERNAME_RE.test(clean(value));

export const needsUsernameSetup = (user) => {
  const displayUsername = normalizeDisplayUsername(user?.displayUsername);
  if (displayUsername && !isGeneratedUsername(displayUsername)) return false;

  const username = clean(user?.username);
  return !username || isGeneratedUsername(username);
};

export const getUserDisplayName = (user, fallback = "Creator") => {
  const displayUsername = normalizeDisplayUsername(user?.displayUsername);
  if (displayUsername && !isGeneratedUsername(displayUsername)) {
    return displayUsername;
  }

  const username = clean(user?.username);
  if (username && !isGeneratedUsername(username)) return username;

  return fallback;
};

export const backendUsernameFromDisplay = (value, suffix = "") => {
  const base =
    normalizeDisplayUsername(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20) || "creator";
  const safeBase = /^\d/.test(base) ? `u_${base}` : base;
  return `${safeBase}${suffix}`.slice(0, 28);
};
