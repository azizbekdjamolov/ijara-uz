import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import uz from "./locales/uz.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["uz", "ru", "en"] as const;
const STORAGE_KEY = "ijara_lang";

let initialized = false;

function detectLang(): string {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (SUPPORTED_LANGS as readonly string[]).includes(stored)) {
        return stored;
      }
    }
  } catch {
    /* SSR / private mode */
  }
  return "uz";
}

export function initI18n() {
  if (initialized) return i18n;
  initialized = true;
  i18n.use(initReactI18next).init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: detectLang(),
    fallbackLng: "uz",
    interpolation: { escapeValue: false },
  });
  return i18n;
}

export default i18n;
