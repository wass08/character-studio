import PocketBase from "pocketbase";

const AUTH_REFRESH_WINDOW_SECONDS = 10 * 60;

function tokenExpiresSoon(token) {
  if (!token) {
    return true;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    return (
      typeof payload.exp !== "number" ||
      payload.exp - Date.now() / 1000 <= AUTH_REFRESH_WINDOW_SECONDS
    );
  } catch {
    return true;
  }
}

export async function createPocketBase(config) {
  const pb = new PocketBase(config.pocketBaseUrl);
  let authInProgress;

  async function authenticate() {
    await pb
      .collection("_superusers")
      .authWithPassword(config.pocketBaseEmail, config.pocketBasePassword);
  }

  async function ensureAuth(error) {
    const wasUnauthorized = error?.status === 401;
    if (!wasUnauthorized && !tokenExpiresSoon(pb.authStore.token)) {
      return;
    }

    if (!authInProgress) {
      authInProgress = authenticate().finally(() => {
        authInProgress = undefined;
      });
    }

    await authInProgress;
  }

  await ensureAuth();
  return { pb, ensureAuth };
}
