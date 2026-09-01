import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface OpenAddState {
  openAdd?: boolean;
}

/**
 * Lets the mobile quick-add button open a page's "add" dialog directly.
 *
 * The caller navigates with `state: { openAdd: true }`; the target page hands
 * its dialog setter to this hook. The flag is consumed immediately so a
 * reload or back-navigation does not reopen the dialog.
 */
export function useOpenAddOnNavigate(open: () => void): void {
  const location = useLocation();
  const navigate = useNavigate();
  const shouldOpen = Boolean((location.state as OpenAddState | null)?.openAdd);

  useEffect(() => {
    if (!shouldOpen) return;
    open();
    navigate(location.pathname, { replace: true, state: null });
  }, [shouldOpen, open, navigate, location.pathname]);
}
