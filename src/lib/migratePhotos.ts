import { useStore } from "@/store";
import { dataUrlToBlob, isPhotoRef, putPhoto } from "./photoStore";

/**
 * Moves photos written before v4 out of the persisted store.
 *
 * Runs once in the background after start-up. Entries are rewritten one at a
 * time, so an interrupted run simply leaves the rest for the next start — both
 * formats render either way.
 */
export async function migrateLegacyPhotos(): Promise<number> {
  const { journalEntries, updateJournalEntry } = useStore.getState();
  const pending = journalEntries.filter((entry) =>
    entry.photos?.some((photo) => !isPhotoRef(photo)),
  );
  if (pending.length === 0) return 0;

  let migrated = 0;
  for (const entry of pending) {
    try {
      const photos = await Promise.all(
        (entry.photos ?? []).map(async (photo) =>
          isPhotoRef(photo) ? photo : putPhoto(dataUrlToBlob(photo)),
        ),
      );
      updateJournalEntry(entry.id, { photos });
      migrated += 1;
    } catch (error) {
      console.warn("[gardener] could not migrate photos of entry", entry.id, error);
    }
  }
  return migrated;
}
