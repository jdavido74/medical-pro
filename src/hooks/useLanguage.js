import { useTranslation } from 'react-i18next';

/**
 * Hook personnalisé pour gérer les traductions avec i18next
 * Compatible avec l'ancienne API LanguageContext
 */
export const useLanguage = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  return {
    language: i18n.language,
    changeLanguage,
    t
  };
};

export default useLanguage;
