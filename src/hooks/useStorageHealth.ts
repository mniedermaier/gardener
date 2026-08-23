import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import { onStorageFailure, storagePressure } from "@/lib/persistStorage";

const WARN_ABOVE = 0.85;

/**
 * Tells the user when their data stops being saved.
 *
 * A failed localStorage write is otherwise invisible: the app keeps working on
 * in-memory state and everything written since the failure is gone after a
 * reload.
 */
export function useStorageHealth() {
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onStorageFailure(({ kind }) => {
      toast(kind === "quota" ? t("storage.full") : t("storage.failed"), "error");
    });
    return unsubscribe;
  }, [t, toast]);

  useEffect(() => {
    void storagePressure().then((used) => {
      if (used !== null && used >= WARN_ABOVE) {
        toast(t("storage.almostFull", { percent: Math.round(used * 100) }), "warning");
      }
    });
  }, [t, toast]);
}
