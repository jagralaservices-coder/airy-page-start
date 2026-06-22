import React from 'react';
import { ArrowLeft, Globe, Languages, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocale } from '@/contexts/LocaleContext';
import { countries, languages, CountryCode, LanguageCode } from '@/lib/i18n';

interface LocaleSettingsProps {
  onBack: () => void;
}

const LocaleSettings: React.FC<LocaleSettingsProps> = ({ onBack }) => {
  const { country, language, setCountry, setLanguage, currentCountry, t, formatCurrency } = useLocale();

  const countryList = Object.values(countries);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{t('settings.language')} & {t('settings.currency')}</h2>
          <p className="text-sm text-muted-foreground">
            Configure your region and language preferences
          </p>
        </div>
      </div>

      {/* Country Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('settings.country')}
          </CardTitle>
          <CardDescription>
            Select your country to set currency and available languages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={country}
            onValueChange={(value) => setCountry(value as CountryCode)}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {countryList.map((c) => (
              <div key={c.code} className="relative">
                <RadioGroupItem
                  value={c.code}
                  id={`country-${c.code}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`country-${c.code}`}
                  className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  <span className="text-2xl">{c.flag}</span>
                  <div className="flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.currency.symbol} {c.currency.code}
                    </p>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t('settings.language')}
          </CardTitle>
          <CardDescription>
            Choose your preferred language ({currentCountry.name} supports these languages)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={language}
            onValueChange={(value) => setLanguage(value as LanguageCode)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {currentCountry.languages.map((langCode) => {
              const lang = languages[langCode];
              return (
                <div key={langCode} className="relative">
                  <RadioGroupItem
                    value={langCode}
                    id={`lang-${langCode}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`lang-${langCode}`}
                    className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{lang.name}</p>
                      <p className="text-sm text-muted-foreground">{lang.nativeName}</p>
                    </div>
                    {lang.dir === 'rtl' && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">RTL</span>
                    )}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Currency Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('settings.currency')} Preview
          </CardTitle>
          <CardDescription>
            See how prices will be displayed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[100, 500, 1000, 5000].map((amount) => (
              <div key={amount} className="p-3 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Sample</p>
                <p className="text-lg font-semibold">{formatCurrency(amount)}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-primary/5 rounded-lg">
            <p className="text-sm">
              <strong>Current Settings:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Country: {currentCountry.flag} {currentCountry.name}</li>
              <li>• Currency: {currentCountry.currency.name} ({currentCountry.currency.symbol})</li>
              <li>• Language: {languages[language].name} ({languages[language].nativeName})</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocaleSettings;
