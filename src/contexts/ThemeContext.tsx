/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextData {
  theme: Theme;
  comfortableContrast: boolean;
  setTheme: (theme: Theme) => void;
  setComfortableContrast: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextData | undefined>(undefined);
const CONFIGURATION_STORAGE_KEY = '@efficientia:configuracao';
const THEME_STORAGE_KEY = '@efficientia:theme';
const CONTRAST_STORAGE_KEY = '@efficientia:comfortable-contrast';

function readInitialPreferences(): { theme: Theme; comfortableContrast: boolean } {
  try {
    const savedConfiguration = localStorage.getItem(CONFIGURATION_STORAGE_KEY);
    const configuration = savedConfiguration ? JSON.parse(savedConfiguration) as { tema?: string; contraste?: boolean } : null;
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const storedContrast = localStorage.getItem(CONTRAST_STORAGE_KEY);
    return {
      theme: storedTheme === 'dark' || configuration?.tema === 'escuro' ? 'dark' : 'light',
      comfortableContrast: storedContrast === 'true' || configuration?.contraste === true,
    };
  } catch {
    return { theme: 'light', comfortableContrast: false };
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => readInitialPreferences(), []);
  const [theme, setThemeState] = useState<Theme>(initial.theme);
  const [comfortableContrast, setContrastState] = useState(initial.comfortableContrast);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      const current = JSON.parse(localStorage.getItem(CONFIGURATION_STORAGE_KEY) || '{}') as Record<string, unknown>;
      localStorage.setItem(CONFIGURATION_STORAGE_KEY, JSON.stringify({ ...current, tema: nextTheme === 'dark' ? 'escuro' : 'claro' }));
    } catch {
      // A interface continua funcionando mesmo sem persistência disponível.
    }
  }, []);

  const setComfortableContrast = useCallback((enabled: boolean) => {
    setContrastState(enabled);
    try {
      localStorage.setItem(CONTRAST_STORAGE_KEY, String(enabled));
      const current = JSON.parse(localStorage.getItem(CONFIGURATION_STORAGE_KEY) || '{}') as Record<string, unknown>;
      localStorage.setItem(CONFIGURATION_STORAGE_KEY, JSON.stringify({ ...current, contraste: enabled }));
    } catch {
      // A interface continua funcionando mesmo sem persistência disponível.
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.contrast = comfortableContrast ? 'comfortable' : 'standard';
    document.documentElement.style.colorScheme = theme;
  }, [theme, comfortableContrast]);

  const value = useMemo(() => ({ theme, comfortableContrast, setTheme, setComfortableContrast }), [theme, comfortableContrast, setTheme, setComfortableContrast]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextData {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return context;
}
