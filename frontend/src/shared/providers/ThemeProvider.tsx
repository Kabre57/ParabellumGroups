'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Types de thème disponibles
 */
export type Theme = 'light' | 'dark';

/**
 * Interface du contexte de thème
 */
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/**
 * Contexte de thème
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Props du ThemeProvider
 */
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

/**
 * Provider de thème
 * Gère le thème de l'application (dark/light) avec persistance localStorage
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'light' 
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Récupérer le thème depuis localStorage au démarrage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      
      // Détection du thème système si disponible
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    
    return defaultTheme;
  });

  /**
   * Appliquer le thème au document
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Ajouter/retirer la classe dark sur l'élément HTML
      const root = document.documentElement;
      
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      // Sauvegarder dans localStorage
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  /**
   * Changer de thème
   */
  const setTheme = (newTheme: Theme): void => {
    setThemeState(newTheme);
  };

  /**
   * Alterner entre les thèmes
   */
  const toggleTheme = (): void => {
    setThemeState((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  /**
   * Valeur du contexte
   */
  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Hook pour accéder au contexte de thème
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};
