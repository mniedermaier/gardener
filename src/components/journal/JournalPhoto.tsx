import { useEffect, useState } from "react";
import { isPhotoRef, resolvePhotoSrc } from "@/lib/photoStore";

/**
 * Renders a journal photo from either format: an IndexedDB reference (current)
 * or an inline data URL (written before photos moved out of the store).
 */
export function useResolvedPhoto(value: string | null): string | null {
  // Object URL of the last resolved IndexedDB reference, keyed by that reference.
  const [resolved, setResolved] = useState<{ ref: string; url: string | null } | null>(null);
  const isRef = Boolean(value && isPhotoRef(value));

  useEffect(() => {
    if (!value || !isRef) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    resolvePhotoSrc(value).then((url) => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setResolved({ ref: value, url });
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [value, isRef]);

  if (!value) return null;
  if (!isRef) return value;
  return resolved?.ref === value ? resolved.url : null;
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
