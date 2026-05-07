import { create } from 'zustand';
import i18n from 'i18next';

interface AppState {
  locale: 'en' | 'zh';
  setLocale: (locale: 'en' | 'zh') => void;
  token: string | null;
  setToken: (token: string | null) => void;
  currentUser: { id: number; name: string; role?: string } | null;
  setCurrentUser: (user: { id: number; name: string; role?: string } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  locale: 'zh',
  setLocale: (locale) => {
    i18n.changeLanguage(locale);
    set({ locale });
  },
  token: localStorage.getItem('token'),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
  },
  currentUser: null,
  setCurrentUser: (currentUser) => set({ currentUser })
}));
