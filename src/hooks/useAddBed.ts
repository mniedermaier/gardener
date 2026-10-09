import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { OpenAddState } from "./useOpenAddOnNavigate";

/**
 * "Beet hinzufügen" from any page that needs a bed first (soil, water, tasks,
 * calendar, plant detail): opens the planner with its add-bed dialog, so the
 * next step is one tap instead of "Zum Planer" and searching the button again.
 */
export function useAddBed(): () => void {
  const navigate = useNavigate();
  return useCallback(() => navigate("/planner", { state: { openAdd: true } satisfies OpenAddState }), [navigate]);
}
