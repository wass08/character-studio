import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import PocketBase from "pocketbase";

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
};

const buildClient = () =>
  new S3Client({
    region: "auto",
    endpoint: required("R2_ENDPOINT"),
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });

// Verifies the PB auth token sent in the Authorization header and ensures the
// caller has the `admin` role on the users collection.
async function requireAdmin(req) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Missing token", status: 401 };
  const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
  pb.authStore.save(token, null);
  try {
    const auth = await pb.collection("users").authRefresh();
    if (auth.record?.role !== "admin") {
      return { error: "Forbidden", status: 403 };
    }
    return { pb, user: auth.record };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

const sanitize = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fileName, contentType, prefix = "assets" } = body || {};
  if (!fileName || !contentType) {
    return NextResponse.json(
      { error: "fileName and contentType are required" },
      { status: 400 },
    );
  }

  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const safePrefix = prefix.replace(/[^a-zA-Z0-9/_-]/g, "").slice(0, 60);
  const key = `${safePrefix}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${sanitize(fileName)}`;

  const client = buildClient();
  const command = new PutObjectCommand({
    Bucket: required("R2_BUCKET"),
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  let publicBase = required("R2_PUBLIC_URL").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(publicBase)) publicBase = `https://${publicBase}`;
  const publicUrl = `${publicBase}/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
