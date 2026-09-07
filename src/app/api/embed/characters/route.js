import {
  assertBodySize,
  createGuestCharacter,
  EMBED_RATE_LIMITS,
  embedError,
  embedJson,
  guestTokenFrom,
  parseCharacterForm,
  publicCharacter,
  rateLimited,
} from "@/lib/server/embed";
import { checkRateLimit } from "@/lib/server/modelResolver";

// POST /api/embed/characters — create a guest-owned character.
// multipart/form-data with the same fields the editor save sends
// (name, gender, height, pose, customization, morphValues, thumbnail) plus
// the x-cs-guest-token header. The server stores a hash of the token and
// enqueues the default bake.
export async function POST(req) {
  const limit = checkRateLimit(req, EMBED_RATE_LIMITS.create);
  if (!limit.ok) return rateLimited(limit);
  try {
    assertBodySize(req);
    const token = guestTokenFrom(req);
    const { fields, thumbnail } = parseCharacterForm(await req.formData());
    const record = await createGuestCharacter({ token, fields, thumbnail });
    return embedJson(publicCharacter(record), 201);
  } catch (error) {
    return embedError(error);
  }
}
