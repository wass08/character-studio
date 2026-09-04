import sharp from "sharp";

export async function compositeSkin(overlays, skinColor) {
  if (overlays.length === 0) {
    return null;
  }

  const firstMetadata = await sharp(overlays[0]).metadata();
  const width = firstMetadata.width;
  const height = firstMetadata.height;
  if (!width || !height) {
    throw new Error("Could not determine makeup overlay dimensions");
  }

  const inputs = [];
  for (const overlay of overlays) {
    const metadata = await sharp(overlay).metadata();
    const overlayWidth = metadata.width || width;
    const overlayHeight = metadata.height || height;
    let image = overlay;

    // Canvas drawImage clips pixels outside the first overlay's canvas.
    if (overlayWidth > width || overlayHeight > height) {
      image = await sharp(overlay)
        .extract({
          left: 0,
          top: 0,
          width: Math.min(width, overlayWidth),
          height: Math.min(height, overlayHeight),
        })
        .toBuffer();
    }
    inputs.push({ input: image, left: 0, top: 0, blend: "over" });
  }

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: skinColor || "#ffffff",
    },
  })
    .composite(inputs)
    .png()
    .toBuffer();
}
