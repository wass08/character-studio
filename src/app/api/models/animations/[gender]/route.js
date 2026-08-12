import { NextResponse } from "next/server";
import animationAssets from "@/lib/generated/animation-assets.json";

function publicR2Url(key) {
  let base = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "");
  if (!base) return null;
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return `${base}/${key}`;
}

// Stable loader indirection for shared animation libraries. Published files
// are immutable and content-addressed; this short app URL can move clients to
// a new generation without changing every engine component.
export async function GET(request, { params }) {
  const { gender: rawGender } = await params;
  const gender = rawGender.replace(/\.glb$/i, "");
  const asset = animationAssets[gender];
  if (!asset) {
    return NextResponse.json(
      { error: "Animation set not found" },
      { status: 404 },
    );
  }

  const publishedUrl = asset.key ? publicR2Url(asset.key) : null;
  return NextResponse.redirect(
    new URL(publishedUrl || asset.localUrl, request.url),
    {
      status: 302,
      headers: {
        "Cache-Control": publishedUrl
          ? "public, max-age=300, stale-while-revalidate=86400"
          : "no-store",
      },
    },
  );
}
