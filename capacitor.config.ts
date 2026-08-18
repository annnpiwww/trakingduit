import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.trakingduit.app",
  appName: "trakingduit",
  webDir: "out",
  server: {
    url: "https://trakingduit.my.id",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0F172A",
      showSpinner: false,
    },
  },
};

export default config;
