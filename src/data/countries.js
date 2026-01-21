// Country data with flags and phone codes
export const countries = [
  { code: 'ES', name: 'España', flag: '🇪🇸', phone: '+34', digits: 9 },
  { code: 'FR', name: 'France', flag: '🇫🇷', phone: '+33', digits: 9 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', phone: '+44', digits: 10 },
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', phone: '+49', digits: 10 },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', phone: '+39', digits: 10 },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', phone: '+351', digits: 9 },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', phone: '+32', digits: 9 },
  { code: 'NL', name: 'Nederland', flag: '🇳🇱', phone: '+31', digits: 9 },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', phone: '+41', digits: 9 },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹', phone: '+43', digits: 10 },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', phone: '+353', digits: 9 },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', phone: '+352', digits: 9 },
  { code: 'DK', name: 'Danmark', flag: '🇩🇰', phone: '+45', digits: 8 },
  { code: 'SE', name: 'Sverige', flag: '🇸🇪', phone: '+46', digits: 9 },
  { code: 'NO', name: 'Norge', flag: '🇳🇴', phone: '+47', digits: 8 },
  { code: 'FI', name: 'Suomi', flag: '🇫🇮', phone: '+358', digits: 9 },
  { code: 'PL', name: 'Polska', flag: '🇵🇱', phone: '+48', digits: 9 },
  { code: 'CZ', name: 'Česko', flag: '🇨🇿', phone: '+420', digits: 9 },
  { code: 'GR', name: 'Ελλάδα', flag: '🇬🇷', phone: '+30', digits: 10 },
  { code: 'RO', name: 'România', flag: '🇷🇴', phone: '+40', digits: 10 },
];

export const nationalities = [
  { code: 'ES', name: 'Española' },
  { code: 'FR', name: 'Francesa' },
  { code: 'GB', name: 'Británica' },
  { code: 'DE', name: 'Alemana' },
  { code: 'IT', name: 'Italiana' },
  { code: 'PT', name: 'Portuguesa' },
  { code: 'BE', name: 'Belga' },
  { code: 'NL', name: 'Neerlandesa' },
  { code: 'CH', name: 'Suiza' },
  { code: 'AT', name: 'Austriaca' },
  { code: 'IE', name: 'Irlandesa' },
  { code: 'LU', name: 'Luxemburguesa' },
  { code: 'DK', name: 'Danesa' },
  { code: 'SE', name: 'Sueca' },
  { code: 'NO', name: 'Noruega' },
  { code: 'FI', name: 'Finlandesa' },
  { code: 'PL', name: 'Polaca' },
  { code: 'CZ', name: 'Checa' },
  { code: 'GR', name: 'Griega' },
  { code: 'RO', name: 'Rumana' },
  { code: 'MA', name: 'Marroquí' },
  { code: 'DZ', name: 'Argelina' },
  { code: 'TN', name: 'Tunecina' },
  { code: 'SN', name: 'Senegalesa' },
  { code: 'NG', name: 'Nigeriana' },
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brasileña' },
  { code: 'CO', name: 'Colombiana' },
  { code: 'MX', name: 'Mexicana' },
  { code: 'PE', name: 'Peruana' },
  { code: 'EC', name: 'Ecuatoriana' },
  { code: 'CL', name: 'Chilena' },
  { code: 'VE', name: 'Venezolana' },
  { code: 'US', name: 'Estadounidense' },
  { code: 'CA', name: 'Canadiense' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistaní' },
  { code: 'BD', name: 'Bangladesí' },
];

export const getCountryByCode = (code) => {
  return countries.find(c => c.code === code);
};

export const getPhonePrefix = (countryCode) => {
  const country = getCountryByCode(countryCode);
  return country ? country.phone : '+';
};

export const getPhoneDigits = (countryCode) => {
  const country = getCountryByCode(countryCode);
  return country ? country.digits : null;
};
