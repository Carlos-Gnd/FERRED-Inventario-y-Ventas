import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark:     boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark:      true,   // oscuro por defecto (según Figma)
      toggleTheme: () => set(s => ({ isDark: !s.isDark })),
    }),
    { name: 'ferred-theme' }
  )
);