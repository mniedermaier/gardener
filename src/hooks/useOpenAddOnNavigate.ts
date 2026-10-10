import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Context handed to an "add" dialog from a deep link (e.g. a planner cell). */
export interface AddPrefill {
  plantId?: string;
  bedId?: string;
  gardenId?: string;
}

export interface OpenAddState {
  openAdd?: boolean;
  /** Optional defaults for the add dialog; pages may ignore them. */
  prefill?: AddPrefill;
}

/**
 * Lets the mobile quick-add button (and deep links such as "Ernte erfassen"
 * in the planner) open a page's "add" dialog directly.
 *
 * The caller navigates with `state: { openAdd: true, prefill? }`; the target
 * page hands its dialog opener to this hook and receives the prefill as the
 * first argument. The flag is consumed immediately so a reload or
 * back-navigation does not reopen the dialog.
 */
export function useOpenAddOnNavigate(open: (prefill?: AddPrefill) => void): void {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as OpenAddState | null;
  const shouldOpen = Boolean(state?.openAdd);
  const prefill = state?.prefill;

  useEffect(() => {
    if (!shouldOpen) return;
    open(prefill);
    navigate(location.pathname, { replace: true, state: null });
  }, [shouldOpen, open, navigate, location.pathname, prefill]);
}

/**
 * Variant for pages whose add dialog takes query-style parameters
 * (`{ plant, bed }`, see `useAddFromUrl`): translates the navigation prefill
 * so "Ernte erfassen: Tomate" opens the dialog with plant and bed filled in.
 */
export function useOpenAddParamsOnNavigate(open: (params: { plant?: string; bed?: string }) => void): void {
  const openWithPrefill = useCallback(
    (prefill?: AddPrefill) => open({ plant: prefill?.plantId, bed: prefill?.bedId }),
    [open],
  );
  useOpenAddOnNavigate(openWithPrefill);
}
