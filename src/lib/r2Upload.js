"use client";

import { pb } from "@/stores/useConfiguratorStore";

const presign = async ({ file, prefix }) => {
  const res = await fetch("/api/r2/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pb.authStore.token}`,
    },
    body: JSON.stringify({
      fileName: file.name || "blob",
      contentType: file.type || "application/octet-stream",
      prefix,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Presign failed (${res.status})`);
  }
  return res.json();
};

export const uploadToR2 = async (file, prefix) => {
  const { uploadUrl, publicUrl } = await presign({ file, prefix });
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  return publicUrl;
};
