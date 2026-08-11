"use client";

import * as React from "react";
import { getTier } from "./subscription";

export type Theme = "light" | "dark";
/** Tema warna premium (khusus tier Pro). Warna diatur lewat CSS data-accent. */
export type Accent = "default" | "violet" | "ocean" | "sunset" | "rose" | "forest";

const KEY = "td.theme";
const ACCENT_KEY = "td.accent";

interface ThemeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
}

const Ctx = React.createContext<ThemeValue>({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
  accent: "default",
  setAccent: () => {},
});

export const useTheme = () => React.useContext(Ctx);

/** Runs before paint so the first frame already has the right palette. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);var a=localStorage.getItem('${ACCENT_KEY}');if(a&&a!=='default'){document.documentElement.setAttribute('data-accent',a);}}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("dark");
  const [accent, setAccentState] = React.useState<Accent>("default");

  React.useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    setThemeState(current);
    const acc = (document.documentElement.getAttribute("data-accent") as Accent) || "default";
    setAccentState(acc);
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(KEY, t);
    setThemeState(t);
  }, []);

  const toggle = React.useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  const setAccent = React.useCallback((a: Accent) => {
    if (a === "default") document.documentElement.removeAttribute("data-accent");
    else document.documentElement.setAttribute("data-accent", a);
    localStorage.setItem(ACCENT_KEY, a);
    setAccentState(a);
  }, []);

  // Tema warna premium cuma buat Pro. Enforce di root biar user free/plus yang
  // nyimpen accent lama (mis. dari masa Pro) nggak kebagian palette premium
  // di seluruh app. Reset reaktif saat tier turun tetap ada di halaman Settings.
  React.useEffect(() => {
    void getTier().then((t) => {
      if (t !== "pro") setAccent("default");
    });
  }, [setAccent]);

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle, accent, setAccent }}>
      {children}
    </Ctx.Provider>
  );
}
