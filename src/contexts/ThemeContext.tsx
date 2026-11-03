/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type FontSizeScale = 'normal' | 'medio' | 'grande' | 'extragrande';

export interface ThemeContextData {
  theme: Theme;
  comfortableContrast: boolean;
  fontSize: FontSizeScale;
  reducedMotion: boolean;
  enhancedFocus: boolean;
  textSpacing: boolean;
  setTheme: (theme: Theme) => void;
  setComfortableContrast: (enabled: boolean) => void;
  setFontSize: (size: FontSizeScale) => void;
  setReducedMotion: (enabled: boolean) => void;
  setEnhancedFocus: (enabled: boolean) => void;
  setTextSpacing: (enabled: boolean) => void;
  resetAccessibility: () => void;
}

const ThemeContext = createContext<ThemeContextData | undefined>(undefined);
const CONFIGURATION_STORAGE_KEY = '@efficientia:configuracao';
const THEME_STORAGE_KEY = '@efficientia:theme';
const CONTRAST_STORAGE_KEY = '@efficientia:comfortable-contrast';
const FONT_SIZE_STORAGE_KEY = '@efficientia:font-size';
const REDUCED_MOTION_STORAGE_KEY = '@efficientia:reduced-motion';
const ENHANCED_FOCUS_STORAGE_KEY = '@efficientia:enhanced-focus';
const TEXT_SPACING_STORAGE_KEY = '@efficientia:text-spacing';

interface InitialA11yPreferences {
  theme: Theme;
  comfortableContrast: boolean;
  fontSize: FontSizeScale;
  reducedMotion: boolean;
  enhancedFocus: boolean;
  textSpacing: boolean;
}

function readInitialPreferences(): InitialA11yPreferences {
  try {
    const savedConfig = localStorage.getItem(CONFIGURATION_STORAGE_KEY);
    const configuration = savedConfig ? (JSON.parse(savedConfig) as Record<string, unknown>) : null;

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const storedContrast = localStorage.getItem(CONTRAST_STORAGE_KEY);
    const storedFontSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY) as FontSizeScale | null;
    const storedReducedMotion = localStorage.getItem(REDUCED_MOTION_STORAGE_KEY);
    const storedEnhancedFocus = localStorage.getItem(ENHANCED_FOCUS_STORAGE_KEY);
    const storedTextSpacing = localStorage.getItem(TEXT_SPACING_STORAGE_KEY);

    const validFontSizes: FontSizeScale[] = ['normal', 'medio', 'grande', 'extragrande'];
    const resolvedFontSize = storedFontSize && validFontSizes.includes(storedFontSize)
      ? storedFontSize
      : (typeof configuration?.escalaFonte === 'string' && validFontSizes.includes(configuration.escalaFonte as FontSizeScale)
          ? (configuration.escalaFonte as FontSizeScale)
          : 'normal');

    return {
      theme: storedTheme === 'dark' || configuration?.tema === 'escuro' ? 'dark' : 'light',
      comfortableContrast: storedContrast === 'true' || configuration?.contraste === true,
      fontSize: resolvedFontSize,
      reducedMotion: storedReducedMotion === 'true' || configuration?.reducaoMovimento === true,
      enhancedFocus: storedEnhancedFocus === 'true' || configuration?.focoReforcado === true,
      textSpacing: storedTextSpacing === 'true' || configuration?.espacamentoTexto === true,
    };
  } catch {
    return {
      theme: 'light',
      comfortableContrast: false,
      fontSize: 'normal',
      reducedMotion: false,
      enhancedFocus: false,
      textSpacing: false,
    };
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => readInitialPreferences(), []);
  const [theme, setThemeState] = useState<Theme>(initial.theme);
  const [comfortableContrast, setContrastState] = useState(initial.comfortableContrast);
  const [fontSize, setFontSizeState] = useState<FontSizeScale>(initial.fontSize);
  const [reducedMotion, setReducedMotionState] = useState(initial.reducedMotion);
  const [enhancedFocus, setEnhancedFocusState] = useState(initial.enhancedFocus);
  const [textSpacing, setTextSpacingState] = useState(initial.textSpacing);

  const syncConfigStorage = (patch: Record<string, unknown>) => {
    try {
      const current = JSON.parse(localStorage.getItem(CONFIGURATION_STORAGE_KEY) || '{}') as Record<string, unknown>;
      localStorage.setItem(CONFIGURATION_STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
    } catch {
      // Falha silenciosa de storage
    }
  };

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      syncConfigStorage({ tema: nextTheme === 'dark' ? 'escuro' : 'claro' });
    } catch {
      // Ignora erro de storage
    }
  }, []);

  const setComfortableContrast = useCallback((enabled: boolean) => {
    setContrastState(enabled);
    try {
      localStorage.setItem(CONTRAST_STORAGE_KEY, String(enabled));
      syncConfigStorage({ contraste: enabled });
    } catch {
      // Ignora erro de storage
    }
  }, []);

  const setFontSize = useCallback((size: FontSizeScale) => {
    setFontSizeState(size);
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
      syncConfigStorage({ escalaFonte: size });
    } catch {
      // Ignora erro de storage
    }
  }, []);

  const setReducedMotion = useCallback((enabled: boolean) => {
    setReducedMotionState(enabled);
    try {
      localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, String(enabled));
      syncConfigStorage({ reducaoMovimento: enabled });
    } catch {
      // Ignora erro de storage
    }
  }, []);

  const setEnhancedFocus = useCallback((enabled: boolean) => {
    setEnhancedFocusState(enabled);
    try {
      localStorage.setItem(ENHANCED_FOCUS_STORAGE_KEY, String(enabled));
      syncConfigStorage({ focoReforcado: enabled });
    } catch {
      // Ignora erro de storage
    }
  }, []);

  const setTextSpacing = useCallback((enabled: boolean) => {
    setTextSpacingState(enabled);
    try {
      localStorage.setItem(TEXT_SPACING_STORAGE_KEY, String(enabled));
      syncConfigStorage({ espacamentoTexto: enabled });
    } catch {
      // Ignora erro de storage
    }
  }, []);

  const resetAccessibility = useCallback(() => {
    setThemeState('light');
    setContrastState(false);
    setFontSizeState('normal');
    setReducedMotionState(false);
    setEnhancedFocusState(false);
    setTextSpacingState(false);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      localStorage.setItem(CONTRAST_STORAGE_KEY, 'false');
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, 'normal');
      localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, 'false');
      localStorage.setItem(ENHANCED_FOCUS_STORAGE_KEY, 'false');
      localStorage.setItem(TEXT_SPACING_STORAGE_KEY, 'false');
      syncConfigStorage({
        tema: 'claro',
        contraste: false,
        escalaFonte: 'normal',
        reducaoMovimento: false,
        focoReforcado: false,
        espacamentoTexto: false,
      });
    } catch {
      // Ignora erro de storage
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.contrast = comfortableContrast ? 'comfortable' : 'standard';
    document.documentElement.dataset.fontSize = fontSize;
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
    document.documentElement.dataset.enhancedFocus = String(enhancedFocus);
    document.documentElement.dataset.textSpacing = String(textSpacing);
    document.documentElement.style.colorScheme = theme;
  }, [theme, comfortableContrast, fontSize, reducedMotion, enhancedFocus, textSpacing]);

  const value = useMemo(
    () => ({
      theme,
      comfortableContrast,
      fontSize,
      reducedMotion,
      enhancedFocus,
      textSpacing,
      setTheme,
      setComfortableContrast,
      setFontSize,
      setReducedMotion,
      setEnhancedFocus,
      setTextSpacing,
      resetAccessibility,
    }),
    [
      theme,
      comfortableContrast,
      fontSize,
      reducedMotion,
      enhancedFocus,
      textSpacing,
      setTheme,
      setComfortableContrast,
      setFontSize,
      setReducedMotion,
      setEnhancedFocus,
      setTextSpacing,
      resetAccessibility,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextData {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return context;
}
