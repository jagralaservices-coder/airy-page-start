import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  CountryCode,
  LanguageCode,
  countries,
  languages,
  getTranslation,
  formatCurrencyByCountry,
  getStoredCountry,
  setStoredCountry,
  getStoredLanguage,
  setStoredLanguage,
  Country,
} from '@/lib/i18n';

interface LocaleContextType {
  country: CountryCode;
  language: LanguageCode;
  setCountry: (code: CountryCode) => void;
  setLanguage: (code: LanguageCode) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
  currentCountry: Country;
  isRTL: boolean;
  availableLanguages: LanguageCode[];
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [country, setCountryState] = useState<CountryCode>(getStoredCountry());
  const [language, setLanguageState] = useState<LanguageCode>(getStoredLanguage());

  const currentCountry = countries[country];
  const isRTL = languages[language].dir === 'rtl';
  const availableLanguages = currentCountry.languages;

  // Apply RTL direction
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [isRTL, language]);

  const setCountry = useCallback((code: CountryCode) => {
    setCountryState(code);
    setStoredCountry(code);
    
    // If current language isn't available in new country, switch to default
    const newCountry = countries[code];
    if (!newCountry.languages.includes(language)) {
      setLanguageState(newCountry.defaultLanguage);
      setStoredLanguage(newCountry.defaultLanguage);
    }
  }, [language]);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    setStoredLanguage(code);
  }, []);

  const t = useCallback((key: string): string => {
    return getTranslation(key, language);
  }, [language]);

  const formatCurrency = useCallback((amount: number): string => {
    return formatCurrencyByCountry(amount, country);
  }, [country]);

  return (
    <LocaleContext.Provider
      value={{
        country,
        language,
        setCountry,
        setLanguage,
        t,
        formatCurrency,
        currentCountry,
        isRTL,
        availableLanguages,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
