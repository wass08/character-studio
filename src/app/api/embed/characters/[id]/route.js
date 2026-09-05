import {
  EMBED_RATE_LIMITS,
  embedError,
  embedJson,
  guestTokenFrom,
  loadOwnedGuestCharacter,
  parseCharacterForm,
  publicCharacter,
  rateLimited,
  updateGuestCharacter,
} from "@/lib/server/embed";
import { checkRateLimit, getSuperuserPb } from "@/lib/server/modelResolver";

// GET   /api/embed/characters/{id} — the guest's own record (token required).
// PATCH /api/embed/characters/{id} — update it (same multipart body as create,
//        every field optional) and enqueue a re-bake.

export async function GET(req, { params }) {
  const limit = checkRateLimit(req, EMBED_RATE_LIMITS.write);
  if (!limit.ok) return rateLimited(limit);
  try {
    const token = guestTokenFrom(req);
    const { id } = await params;
    const pb = await getSuperuserPb();
    const record = await loadOwnedGuestCharacter(pb, id, token);
    return embedJson(publicCharacter(record));
  } catch (error) {
    return embedError(error);
  }
}

export async function PATCH(req, { params }) {
  const limit = checkRateLimit(req, EMBED_RATE_LIMITS.write);
  if (!limit.ok) return rateLimited(limit);
  try {
    const token = guestTokenFrom(req);
    const { id } = await params;
    const { fields, thumbnail } = parseCharacterForm(await req.formData(), {
      partial: true,
    });
    const record = await updateGuestCharacter({
      token,
      characterId: id,
      fields,
      thumbnail,
    });
    return embedJson(publicCharacter(record));
  } catch (error) {
    return embedError(error);
  }
}
