import { useEffect, useState } from "react";
import { isPhotoRef, resolvePhotoSrc } from "@/lib/photoStore";

/**
 * Renders a journal photo from either format: an IndexedDB reference (current)
 * or an inline data URL (written before photos moved out of the store).
 */
export function useResolvedPhoto(value: string | null): string | null {
  const [src, setSrc] = useState<string | null>(value && !isPhotoRef(value) ? value : null);

  useEffect(() => {
    if (!value) {
      setSrc(null);
      return;
    }
    if (!isPhotoRef(value)) {
      setSrc(value);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    resolvePhotoSrc(value).then((resolved) => {
      if (cancelled) {
        if (resolved) URL.revokeObjectURL(resolved);
        return;
      }
      objectUrl = resolved;
      setSrc(resolved);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [value]);

  return src;
}

export function JournalPhoto({
  photo,
  alt,
  className,
}: {
  photo: string;
  alt: string;
  className?: string;
}) {
  const src = useResolvedPhoto(photo);
  if (!src) return <div className={className} aria-hidden="true" />;
  return <img src={src} alt={alt} className={className} />;
}
