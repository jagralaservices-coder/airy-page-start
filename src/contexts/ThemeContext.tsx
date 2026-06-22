import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    try {
      // Check for saved theme, default to light for phone-friendly experience
      const savedTheme = localStorage.getItem('pos_theme') as Theme | null;
      const safeTheme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
      setThemeState(safeTheme);
      document.documentElement.classList.toggle('dark', safeTheme === 'dark');
    } catch {
      setThemeState('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    try { localStorage.setItem('pos_theme', newTheme); } catch {}
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try { localStorage.setItem('pos_theme', newTheme); } catch {}
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
