import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.mniedermaier.gardener",
  appName: "Gardener",
  webDir: "dist",
  // Serve the bundle from https://localhost so Web APIs that require a secure
  // context (Clipboard, Geolocation, ...) behave like in the browser.
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
