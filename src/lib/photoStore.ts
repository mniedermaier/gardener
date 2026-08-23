/**
 * Photos live in IndexedDB, not in the persisted store.
 *
 * localStorage holds roughly 5 MB for the whole origin, and a single 800x600
 * JPEG costs ~114 KB once base64-encoded. Keeping photos in the same blob as
 * every other record filled the quota after a couple of dozen journal entries,
 * and the write then failed silently. IndexedDB stores the blobs natively and
 * the journal entry only keeps a reference.
 */

const DB_NAME = "gardener-photos";
const STORE = "photos";
const DB_VERSION = 1;
export const PHOTO_REF_PREFIX = "photo:";

export function isPhotoRef(value: string): boolean {
  return value.startsWith(PHOTO_REF_PREFIX);
}

function photoId(ref: string): string {
  return ref.slice(PHOTO_REF_PREFIX.length);
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

/** Stores a blob and returns the reference to keep on the record. */
export async function putPhoto(blob: Blob): Promise<string> {
  const id = nextId();
  await tx("readwrite", (store) => store.put(blob, id));
  return `${PHOTO_REF_PREFIX}${id}`;
}

export async function getPhoto(ref: string): Promise<Blob | null> {
  if (!isPhotoRef(ref)) return null;
  const blob = await tx<Blob | undefined>("readonly", (store) => store.get(photoId(ref)));
  return blob ?? null;
}

export async function deletePhotos(refs: readonly string[]): Promise<void> {
  await Promise.all(
    refs.filter(isPhotoRef).map((ref) => tx("readwrite", (store) => store.delete(photoId(ref)))),
  );
}

/** Turns a data URL (the legacy in-store format) into a blob. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(header)?.[1] ?? "image/jpeg";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Resolves either format to something an <img src> accepts. Legacy data URLs
 * pass through untouched so entries written before the move keep rendering.
 */
export async function resolvePhotoSrc(value: string): Promise<string | null> {
  if (!isPhotoRef(value)) return value;
  const blob = await getPhoto(value);
  return blob ? URL.createObjectURL(blob) : null;
}
