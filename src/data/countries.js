// Country data with flags and phone codes
// Organized by region, with ES/FR first (primary markets)
export const countries = [
  // — Primary markets —
  { code: 'ES', name: 'España', flag: '🇪🇸', phone: '+34', digits: 9 },
  { code: 'FR', name: 'France', flag: '🇫🇷', phone: '+33', digits: 9 },

  // — Western Europe —
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', phone: '+376', digits: 6 },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹', phone: '+43', digits: 10 },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', phone: '+32', digits: 9 },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', phone: '+41', digits: 9 },
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', phone: '+49', digits: 10 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', phone: '+44', digits: 10 },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', phone: '+353', digits: 9 },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', phone: '+39', digits: 10 },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', phone: '+352', digits: 9 },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', phone: '+377', digits: 8 },
  { code: 'NL', name: 'Nederland', flag: '🇳🇱', phone: '+31', digits: 9 },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', phone: '+351', digits: 9 },

  // — Northern Europe —
  { code: 'DK', name: 'Danmark', flag: '🇩🇰', phone: '+45', digits: 8 },
  { code: 'EE', name: 'Eesti', flag: '🇪🇪', phone: '+372', digits: 8 },
  { code: 'FI', name: 'Suomi', flag: '🇫🇮', phone: '+358', digits: 9 },
  { code: 'IS', name: 'Ísland', flag: '🇮🇸', phone: '+354', digits: 7 },
  { code: 'LT', name: 'Lietuva', flag: '🇱🇹', phone: '+370', digits: 8 },
  { code: 'LV', name: 'Latvija', flag: '🇱🇻', phone: '+371', digits: 8 },
  { code: 'NO', name: 'Norge', flag: '🇳🇴', phone: '+47', digits: 8 },
  { code: 'SE', name: 'Sverige', flag: '🇸🇪', phone: '+46', digits: 9 },

  // — Central & Eastern Europe —
  { code: 'AL', name: 'Shqipëria', flag: '🇦🇱', phone: '+355', digits: 9 },
  { code: 'BA', name: 'Bosna i Hercegovina', flag: '🇧🇦', phone: '+387', digits: 8 },
  { code: 'BG', name: 'България', flag: '🇧🇬', phone: '+359', digits: 9 },
  { code: 'BY', name: 'Беларусь', flag: '🇧🇾', phone: '+375', digits: 9 },
  { code: 'CZ', name: 'Česko', flag: '🇨🇿', phone: '+420', digits: 9 },
  { code: 'GE', name: 'საქართველო', flag: '🇬🇪', phone: '+995', digits: 9 },
  { code: 'HR', name: 'Hrvatska', flag: '🇭🇷', phone: '+385', digits: 9 },
  { code: 'HU', name: 'Magyarország', flag: '🇭🇺', phone: '+36', digits: 9 },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩', phone: '+373', digits: 8 },
  { code: 'ME', name: 'Crna Gora', flag: '🇲🇪', phone: '+382', digits: 8 },
  { code: 'MK', name: 'Северна Македонија', flag: '🇲🇰', phone: '+389', digits: 8 },
  { code: 'PL', name: 'Polska', flag: '🇵🇱', phone: '+48', digits: 9 },
  { code: 'RO', name: 'România', flag: '🇷🇴', phone: '+40', digits: 10 },
  { code: 'RS', name: 'Србија', flag: '🇷🇸', phone: '+381', digits: 9 },
  { code: 'RU', name: 'Россия', flag: '🇷🇺', phone: '+7', digits: 10 },
  { code: 'SI', name: 'Slovenija', flag: '🇸🇮', phone: '+386', digits: 8 },
  { code: 'SK', name: 'Slovensko', flag: '🇸🇰', phone: '+421', digits: 9 },
  { code: 'UA', name: 'Україна', flag: '🇺🇦', phone: '+380', digits: 9 },
  { code: 'XK', name: 'Kosovë', flag: '🇽🇰', phone: '+383', digits: 8 },

  // — Southern Europe / Mediterranean —
  { code: 'CY', name: 'Κύπρος', flag: '🇨🇾', phone: '+357', digits: 8 },
  { code: 'GR', name: 'Ελλάδα', flag: '🇬🇷', phone: '+30', digits: 10 },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', phone: '+356', digits: 8 },
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷', phone: '+90', digits: 10 },

  // — North Africa / Maghreb —
  { code: 'DZ', name: 'الجزائر', flag: '🇩🇿', phone: '+213', digits: 9 },
  { code: 'EG', name: 'مصر', flag: '🇪🇬', phone: '+20', digits: 10 },
  { code: 'LY', name: 'ليبيا', flag: '🇱🇾', phone: '+218', digits: 9 },
  { code: 'MA', name: 'المغرب', flag: '🇲🇦', phone: '+212', digits: 9 },
  { code: 'TN', name: 'تونس', flag: '🇹🇳', phone: '+216', digits: 8 },

  // — Sub-Saharan Africa —
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', phone: '+225', digits: 10 },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', phone: '+237', digits: 9 },
  { code: 'CD', name: 'RD Congo', flag: '🇨🇩', phone: '+243', digits: 9 },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', phone: '+233', digits: 9 },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', phone: '+224', digits: 9 },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', phone: '+254', digits: 9 },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', phone: '+223', digits: 8 },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', phone: '+234', digits: 10 },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', phone: '+221', digits: 9 },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', phone: '+27', digits: 9 },

  // — Middle East —
  { code: 'AE', name: 'الإمارات', flag: '🇦🇪', phone: '+971', digits: 9 },
  { code: 'IL', name: 'ישראל', flag: '🇮🇱', phone: '+972', digits: 9 },
  { code: 'JO', name: 'الأردن', flag: '🇯🇴', phone: '+962', digits: 9 },
  { code: 'LB', name: 'لبنان', flag: '🇱🇧', phone: '+961', digits: 8 },
  { code: 'SA', name: 'السعودية', flag: '🇸🇦', phone: '+966', digits: 9 },

  // — Asia —
  { code: 'BD', name: 'বাংলাদেশ', flag: '🇧🇩', phone: '+880', digits: 10 },
  { code: 'CN', name: '中国', flag: '🇨🇳', phone: '+86', digits: 11 },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', phone: '+62', digits: 10 },
  { code: 'IN', name: 'India', flag: '🇮🇳', phone: '+91', digits: 10 },
  { code: 'JP', name: '日本', flag: '🇯🇵', phone: '+81', digits: 10 },
  { code: 'KR', name: '대한민국', flag: '🇰🇷', phone: '+82', digits: 10 },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', phone: '+60', digits: 10 },
  { code: 'PH', name: 'Pilipinas', flag: '🇵🇭', phone: '+63', digits: 10 },
  { code: 'PK', name: 'پاکستان', flag: '🇵🇰', phone: '+92', digits: 10 },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', phone: '+65', digits: 8 },
  { code: 'TH', name: 'ประเทศไทย', flag: '🇹🇭', phone: '+66', digits: 9 },
  { code: 'VN', name: 'Việt Nam', flag: '🇻🇳', phone: '+84', digits: 9 },

  // — North America —
  { code: 'CA', name: 'Canada', flag: '🇨🇦', phone: '+1', digits: 10 },
  { code: 'MX', name: 'México', flag: '🇲🇽', phone: '+52', digits: 10 },
  { code: 'US', name: 'United States', flag: '🇺🇸', phone: '+1', digits: 10 },

  // — Central America & Caribbean —
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', phone: '+506', digits: 8 },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', phone: '+53', digits: 8 },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', phone: '+1', digits: 10 },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', phone: '+502', digits: 8 },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', phone: '+504', digits: 8 },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', phone: '+505', digits: 8 },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', phone: '+507', digits: 8 },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', phone: '+503', digits: 8 },

  // — South America —
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', phone: '+54', digits: 10 },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', phone: '+591', digits: 8 },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', phone: '+55', digits: 11 },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', phone: '+56', digits: 9 },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', phone: '+57', digits: 10 },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', phone: '+593', digits: 9 },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', phone: '+51', digits: 9 },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', phone: '+595', digits: 9 },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', phone: '+598', digits: 8 },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', phone: '+58', digits: 10 },

  // — Oceania —
  { code: 'AU', name: 'Australia', flag: '🇦🇺', phone: '+61', digits: 9 },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', phone: '+64', digits: 9 },
];

export const nationalities = [
  // Europe
  { code: 'ES', name: 'Española' },
  { code: 'FR', name: 'Francesa' },
  { code: 'AD', name: 'Andorrana' },
  { code: 'AL', name: 'Albanesa' },
  { code: 'AT', name: 'Austriaca' },
  { code: 'BA', name: 'Bosnia' },
  { code: 'BE', name: 'Belga' },
  { code: 'BG', name: 'Búlgara' },
  { code: 'BY', name: 'Bielorrusa' },
  { code: 'CH', name: 'Suiza' },
  { code: 'CY', name: 'Chipriota' },
  { code: 'CZ', name: 'Checa' },
  { code: 'DE', name: 'Alemana' },
  { code: 'DK', name: 'Danesa' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finlandesa' },
  { code: 'GB', name: 'Británica' },
  { code: 'GE', name: 'Georgiana' },
  { code: 'GR', name: 'Griega' },
  { code: 'HR', name: 'Croata' },
  { code: 'HU', name: 'Húngara' },
  { code: 'IE', name: 'Irlandesa' },
  { code: 'IS', name: 'Islandesa' },
  { code: 'IT', name: 'Italiana' },
  { code: 'LT', name: 'Lituana' },
  { code: 'LU', name: 'Luxemburguesa' },
  { code: 'LV', name: 'Letona' },
  { code: 'MC', name: 'Monegasca' },
  { code: 'MD', name: 'Moldava' },
  { code: 'ME', name: 'Montenegrina' },
  { code: 'MK', name: 'Macedónica' },
  { code: 'MT', name: 'Maltesa' },
  { code: 'NL', name: 'Neerlandesa' },
  { code: 'NO', name: 'Noruega' },
  { code: 'PL', name: 'Polaca' },
  { code: 'PT', name: 'Portuguesa' },
  { code: 'RO', name: 'Rumana' },
  { code: 'RS', name: 'Serbia' },
  { code: 'RU', name: 'Rusa' },
  { code: 'SE', name: 'Sueca' },
  { code: 'SI', name: 'Eslovena' },
  { code: 'SK', name: 'Eslovaca' },
  { code: 'TR', name: 'Turca' },
  { code: 'UA', name: 'Ucraniana' },
  { code: 'XK', name: 'Kosovar' },
  // North Africa / Middle East
  { code: 'AE', name: 'Emiratí' },
  { code: 'DZ', name: 'Argelina' },
  { code: 'EG', name: 'Egipcia' },
  { code: 'IL', name: 'Israelí' },
  { code: 'JO', name: 'Jordana' },
  { code: 'LB', name: 'Libanesa' },
  { code: 'LY', name: 'Libia' },
  { code: 'MA', name: 'Marroquí' },
  { code: 'SA', name: 'Saudí' },
  { code: 'TN', name: 'Tunecina' },
  // Sub-Saharan Africa
  { code: 'CD', name: 'Congoleña' },
  { code: 'CI', name: 'Marfileña' },
  { code: 'CM', name: 'Camerunesa' },
  { code: 'GH', name: 'Ghanesa' },
  { code: 'GN', name: 'Guineana' },
  { code: 'KE', name: 'Keniata' },
  { code: 'ML', name: 'Maliense' },
  { code: 'NG', name: 'Nigeriana' },
  { code: 'SN', name: 'Senegalesa' },
  { code: 'ZA', name: 'Sudafricana' },
  // Asia
  { code: 'BD', name: 'Bangladesí' },
  { code: 'CN', name: 'China' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japonesa' },
  { code: 'KR', name: 'Surcoreana' },
  { code: 'MY', name: 'Malasia' },
  { code: 'PH', name: 'Filipina' },
  { code: 'PK', name: 'Pakistaní' },
  { code: 'SG', name: 'Singapurense' },
  { code: 'TH', name: 'Tailandesa' },
  { code: 'VN', name: 'Vietnamita' },
  // Americas
  { code: 'AR', name: 'Argentina' },
  { code: 'BO', name: 'Boliviana' },
  { code: 'BR', name: 'Brasileña' },
  { code: 'CA', name: 'Canadiense' },
  { code: 'CL', name: 'Chilena' },
  { code: 'CO', name: 'Colombiana' },
  { code: 'CR', name: 'Costarricense' },
  { code: 'CU', name: 'Cubana' },
  { code: 'DO', name: 'Dominicana' },
  { code: 'EC', name: 'Ecuatoriana' },
  { code: 'GT', name: 'Guatemalteca' },
  { code: 'HN', name: 'Hondureña' },
  { code: 'MX', name: 'Mexicana' },
  { code: 'NI', name: 'Nicaragüense' },
  { code: 'PA', name: 'Panameña' },
  { code: 'PE', name: 'Peruana' },
  { code: 'PY', name: 'Paraguaya' },
  { code: 'SV', name: 'Salvadoreña' },
  { code: 'US', name: 'Estadounidense' },
  { code: 'UY', name: 'Uruguaya' },
  { code: 'VE', name: 'Venezolana' },
  // Oceania
  { code: 'AU', name: 'Australiana' },
  { code: 'NZ', name: 'Neozelandesa' },
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
