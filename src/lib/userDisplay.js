const GENERATED_USERNAME_RE = /^users?\d+$/i;

const clean = (value) => (typeof value === "string" ? value.trim() : "");

export const isGeneratedUsername = (value) =>
  GENERATED_USERNAME_RE.test(clean(value));

export const needsUsernameSetup = (user) => {
  const username = clean(user?.username);
  return !username || isGeneratedUsername(username);
};

export const getUserDisplayName = (user, fallback = "Creator") => {
  const username = clean(user?.username);
  if (username && !isGeneratedUsername(username)) return username;

  return fallback;
};
