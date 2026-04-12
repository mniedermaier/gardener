export function initTheme() {
  const stored = (() => {
    try {
      const data = JSON.parse(localStorage.getItem("gardener-storage") ?? "{}");
      return data?.state?.theme as string | undefined;
    } catch {
      return undefined;
    }
  })();

  const theme = stored ?? "system";
  applyTheme(theme);
}

export function applyTheme(theme: string) {
  if (
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
