"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface TelegramTheme {
  bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
  secondary_bg_color: string;
}

interface TelegramCtx {
  isInTelegram: boolean;
  theme: TelegramTheme | null;
  initData: string;
  userId: number | null;
  ready: () => void;
  close: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBgColor: (color: string) => void;
}

const DEFAULT_THEME: TelegramTheme = {
  bg_color: "#07090f",
  text_color: "#ffffff",
  hint_color: "#8e8e93",
  link_color: "#d4af37",
  button_color: "#d4af37",
  button_text_color: "#1a1405",
  secondary_bg_color: "#111320",
};

const TelegramContext = createContext<TelegramCtx>({
  isInTelegram: false,
  theme: null,
  initData: "",
  userId: null,
  ready: () => {},
  close: () => {},
  expand: () => {},
  setHeaderColor: () => {},
  setBgColor: () => {},
});

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<TelegramCtx>({
    isInTelegram: false,
    theme: null,
    initData: "",
    userId: null,
    ready: () => {},
    close: () => {},
    expand: () => {},
    setHeaderColor: () => {},
    setBgColor: () => {},
  });

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    const theme = tg.themeParams as TelegramTheme | undefined;
    const userId = tg.initDataUnsafe?.user?.id ?? null;

    // Apply Telegram theme as CSS variables
    if (theme) {
      const root = document.documentElement;
      if (theme.bg_color) root.style.setProperty("--tg-bg", theme.bg_color);
      if (theme.text_color) root.style.setProperty("--tg-text", theme.text_color);
      if (theme.hint_color) root.style.setProperty("--tg-hint", theme.hint_color);
      if (theme.link_color) root.style.setProperty("--tg-link", theme.link_color);
      if (theme.button_color) root.style.setProperty("--tg-btn", theme.button_color);
      if (theme.button_text_color) root.style.setProperty("--tg-btn-text", theme.button_text_color);
      if (theme.secondary_bg_color) root.style.setProperty("--tg-secondary-bg", theme.secondary_bg_color);
    }

    tg.ready();
    tg.expand();

    setCtx({
      isInTelegram: true,
      theme: theme ?? DEFAULT_THEME,
      initData: tg.initData || "",
      userId,
      ready: () => tg.ready(),
      close: () => tg.close(),
      expand: () => tg.expand(),
      setHeaderColor: (color: string) => tg.setHeaderColor?.(color),
      setBgColor: (color: string) => tg.setBackgroundColor?.(color),
    });
  }, []);

  return (
    <TelegramContext.Provider value={ctx}>{children}</TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}
