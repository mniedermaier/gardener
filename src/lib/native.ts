import { App as CapacitorApp } from "@capacitor/app";
import { isNativeApp } from "./nativeStorage";

/**
 * Android hardware/gesture back: walk the router history, leave the app only
 * from the dashboard. Open <dialog>s are closed first so back feels native.
 */
export function installNativeHandlers(): void {
  if (!isNativeApp()) return;

  void CapacitorApp.addListener("backButton", () => {
    const openDialog = document.querySelector<HTMLDialogElement>("dialog[open]");
    if (openDialog) {
      openDialog.close();
      return;
    }
    const atRoot = window.location.hash === "" || window.location.hash === "#/";
    if (atRoot) {
      void CapacitorApp.exitApp();
    } else {
      window.history.back();
    }
  });
}
