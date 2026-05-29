"use client";

import GalleryThumbnail from "./GalleryThumbnail";
import { useGalleryPhotos } from "./useGalleryPhotos";

// Sidebar showing previously-captured photos. The Capture and Download
// controls live on PhotoFramingBar (bottom of the Photo Booth) so the
// active capture surface is together with the aspect-ratio picker.
const PhotoGalleryBox = () => {
  const { isLoggedIn, photos, loading, removePhoto } = useGalleryPhotos();

  return (
    <div className="glass-panel thin-scrollbar absolute top-1/2 left-4 z-30 flex max-h-[calc(100vh-120px)] w-[clamp(180px,20vw,260px)] -translate-y-1/2 flex-col gap-2 overflow-y-auto rounded-2xl p-3 max-md:hidden">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-semibold tracking-[0.14em] text-white/65 uppercase">
          Gallery
        </h3>
        <span className="text-[10px] text-white/40">
          {isLoggedIn ? photos.length : ""}
        </span>
      </div>

      {!isLoggedIn ? (
        <div className="py-4 text-center text-[11px] text-white/45">
          Sign in to save photos.
        </div>
      ) : loading && photos.length === 0 ? (
        <div className="py-4 text-center text-[11px] text-white/45">
          Loading…
        </div>
      ) : photos.length === 0 ? (
        <div className="py-4 text-center text-[11px] text-white/45">
          No photos yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <GalleryThumbnail key={p.id} photo={p} onDelete={removePhoto} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoGalleryBox;
