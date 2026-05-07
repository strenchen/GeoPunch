import { create } from 'zustand';
import i18n from 'i18next';

interface AppState {
  locale: 'en' | 'zh';
  setLocale: (locale: 'en' | 'zh') => void;
  currentUser: { id: number; name: string } | null;
  setCurrentUser: (user: { id: number; name: string } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  locale: 'zh',
  setLocale: (locale) => {
    i18n.changeLanguage(locale);
    set({ locale });
  },
  currentUser: null,
  setCurrentUser: (currentUser) => set({ currentUser })
}));