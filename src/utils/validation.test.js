// utils/validation.test.js
import {
  validateEmail,
  validateSiret,
  validatePassword,
  validatePasswordMatch,
  validatePostalCode,
  validateCompanyName,
  validatePersonName,
  validateSpanishPhoneNumber,
  validateFrenchPhoneNumber,
  validatePhoneNumber,
  validateAddress,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateForm,
  validateAdeliNumber,
  validateRppsNumber,
  validateSpanishMedicalNumber,
  validateMedicalNumber,
  validateClinicName
} from './validation';

describe('Validation - Email', () => {
  describe('validateEmail()', () => {
    it('accepte un email valide simple', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('accepte un email avec sous-domaine', () => {
      expect(validateEmail('test@mail.example.com')).toBe(true);
    });

    it('accepte un email avec points dans la partie locale', () => {
      expect(validateEmail('jean.dupont@example.com')).toBe(true);
    });

    it('accepte un email avec tiret', () => {
      expect(validateEmail('jean-dupont@example.com')).toBe(true);
    });

    it('accepte un email avec underscore', () => {
      expect(validateEmail('jean_dupont@example.com')).toBe(true);
    });

    it('rejette un email sans @', () => {
      expect(validateEmail('testexample.com')).toBe(false);
    });

    it('rejette un email sans domaine', () => {
      expect(validateEmail('test@')).toBe(false);
    });

    it('rejette un email sans partie locale', () => {
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('rejette un email avec espaces', () => {
      expect(validateEmail('test @example.com')).toBe(false);
      expect(validateEmail('test@ example.com')).toBe(false);
    });

    it('rejette une chaîne vide', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('rejette un email sans extension de domaine', () => {
      expect(validateEmail('test@example')).toBe(false);
    });
  });
});

describe('Validation - SIRET', () => {
  describe('validateSiret()', () => {
    it('accepte un SIRET valide de 14 chiffres', () => {
      expect(validateSiret('12345678901234')).toBe(true);
    });

    it('rejette un SIRET trop court', () => {
      expect(validateSiret('1234567890123')).toBe(false);
    });

    it('rejette un SIRET trop long', () => {
      expect(validateSiret('123456789012345')).toBe(false);
    });

    it('rejette un SIRET avec des lettres', () => {
      expect(validateSiret('1234567890123A')).toBe(false);
    });

    it('rejette un SIRET avec des espaces', () => {
      expect(validateSiret('12345 67890123')).toBe(false);
    });

    it('rejette une chaîne vide', () => {
      expect(validateSiret('')).toBe(false);
    });
  });
});

describe('Validation - Mot de passe', () => {
  describe('validatePassword()', () => {
    it('accepte un mot de passe de 8 caractères ou plus', () => {
      const result = validatePassword('password');
      expect(result.isValid).toBe(true);
    });

    it('accepte un mot de passe complexe', () => {
      const result = validatePassword('P@ssw0rd!');
      expect(result.isValid).toBe(true);
    });

    it('rejette un mot de passe trop court', () => {
      const result = validatePassword('pass');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Minimum 8 caractères');
    });

    it('rejette un mot de passe vide', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Mot de passe requis');
    });

    it('rejette un mot de passe null', () => {
      const result = validatePassword(null);
      expect(result.isValid).toBe(false);
    });

    it('accepte exactement 8 caractères (limite)', () => {
      const result = validatePassword('12345678');
      expect(result.isValid).toBe(true);
    });

    it('rejette 7 caractères (juste en dessous de la limite)', () => {
      const result = validatePassword('1234567');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePasswordMatch()', () => {
    it('retourne true si les mots de passe correspondent', () => {
      expect(validatePasswordMatch('password123', 'password123')).toBe(true);
    });

    it('retourne false si les mots de passe diffèrent', () => {
      expect(validatePasswordMatch('password123', 'password124')).toBe(false);
    });

    it('retourne false si un mot de passe est vide', () => {
      expect(validatePasswordMatch('password123', '')).toBe(false);
    });

    it('est sensible à la casse', () => {
      expect(validatePasswordMatch('Password', 'password')).toBe(false);
    });
  });
});

describe('Validation - Code postal', () => {
  describe('validatePostalCode()', () => {
    it('accepte un code postal français valide', () => {
      expect(validatePostalCode('75001')).toBe(true);
      expect(validatePostalCode('13008')).toBe(true);
      expect(validatePostalCode('69000')).toBe(true);
    });

    it('rejette un code postal trop court', () => {
      expect(validatePostalCode('7500')).toBe(false);
    });

    it('rejette un code postal trop long', () => {
      expect(validatePostalCode('750011')).toBe(false);
    });

    it('rejette un code postal avec des lettres', () => {
      expect(validatePostalCode('75A01')).toBe(false);
    });

    it('rejette une chaîne vide', () => {
      expect(validatePostalCode('')).toBe(false);
    });
  });
});

describe('Validation - Noms', () => {
  describe('validateCompanyName()', () => {
    it('accepte un nom d\'entreprise valide', () => {
      expect(validateCompanyName('Ma Clinique')).toBe(true);
    });

    it('accepte un nom avec des chiffres', () => {
      expect(validateCompanyName('Clinique 123')).toBe(true);
    });

    it('rejette un nom trop court', () => {
      expect(validateCompanyName('A')).toBe(false);
    });

    it('rejette une chaîne vide', () => {
      expect(validateCompanyName('')).toBe(false);
    });

    it('rejette null', () => {
      expect(validateCompanyName(null)).toBe(false);
    });

    it('accepte exactement 2 caractères (limite)', () => {
      expect(validateCompanyName('AB')).toBe(true);
    });
  });

  describe('validatePersonName()', () => {
    it('accepte un prénom simple', () => {
      expect(validatePersonName('Jean')).toBe(true);
    });

    it('accepte un nom composé avec tiret', () => {
      expect(validatePersonName('Jean-Pierre')).toBe(true);
    });

    it('accepte un nom avec apostrophe', () => {
      expect(validatePersonName("O'Brien")).toBe(true);
    });

    it('accepte un nom avec accents', () => {
      expect(validatePersonName('José')).toBe(true);
      expect(validatePersonName('François')).toBe(true);
      expect(validatePersonName('Müller')).toBe(true);
    });

    it('accepte un nom avec espaces', () => {
      expect(validatePersonName('Van Der Berg')).toBe(true);
    });

    it('rejette un nom trop court', () => {
      expect(validatePersonName('J')).toBe(false);
    });

    it('rejette un nom avec des chiffres', () => {
      expect(validatePersonName('Jean123')).toBe(false);
    });

    it('rejette un nom avec des caractères spéciaux', () => {
      expect(validatePersonName('Jean@Dupont')).toBe(false);
    });

    it('rejette une chaîne vide', () => {
      expect(validatePersonName('')).toBe(false);
    });

    it('rejette null', () => {
      expect(validatePersonName(null)).toBe(false);
    });

    it('accepte exactement 2 caractères (limite)', () => {
      expect(validatePersonName('Li')).toBe(true);
    });

    it('trim les espaces avant validation', () => {
      expect(validatePersonName('  Jean  ')).toBe(true);
    });
  });
});

describe('Validation - Numéros de téléphone', () => {
  describe('validateSpanishPhoneNumber()', () => {
    it('accepte un numéro espagnol mobile valide', () => {
      expect(validateSpanishPhoneNumber('612345678')).toBe(true);
      expect(validateSpanishPhoneNumber('712345678')).toBe(true);
    });

    it('accepte un numéro avec préfixe +34', () => {
      expect(validateSpanishPhoneNumber('+34612345678')).toBe(true);
    });

    it('accepte un numéro avec préfixe 34', () => {
      expect(validateSpanishPhoneNumber('34612345678')).toBe(true);
    });

    it('accepte un numéro fixe espagnol', () => {
      expect(validateSpanishPhoneNumber('912345678')).toBe(true);
      expect(validateSpanishPhoneNumber('812345678')).toBe(true);
    });

    it('accepte un numéro avec espaces', () => {
      expect(validateSpanishPhoneNumber('612 345 678')).toBe(true);
    });

    it('accepte un numéro avec tirets', () => {
      expect(validateSpanishPhoneNumber('612-345-678')).toBe(true);
    });

    it('rejette un numéro trop court', () => {
      expect(validateSpanishPhoneNumber('61234567')).toBe(false);
    });

    it('rejette un numéro trop long', () => {
      expect(validateSpanishPhoneNumber('6123456789')).toBe(false);
    });

    it('rejette un numéro ne commençant pas par 6-9', () => {
      expect(validateSpanishPhoneNumber('512345678')).toBe(false);
    });

    it('rejette null', () => {
      expect(validateSpanishPhoneNumber(null)).toBe(false);
    });
  });

  describe('validateFrenchPhoneNumber()', () => {
    it('accepte un numéro français valide avec 0', () => {
      expect(validateFrenchPhoneNumber('0612345678')).toBe(true);
      expect(validateFrenchPhoneNumber('0123456789')).toBe(true);
    });

    it('accepte un numéro avec préfixe +33', () => {
      expect(validateFrenchPhoneNumber('+33612345678')).toBe(true);
    });

    it('accepte un numéro avec préfixe 33', () => {
      expect(validateFrenchPhoneNumber('33612345678')).toBe(true);
    });

    it('accepte un numéro avec espaces', () => {
      expect(validateFrenchPhoneNumber('06 12 34 56 78')).toBe(true);
    });

    it('accepte un numéro avec tirets', () => {
      expect(validateFrenchPhoneNumber('06-12-34-56-78')).toBe(true);
    });

    it('accepte un numéro avec points', () => {
      expect(validateFrenchPhoneNumber('06.12.34.56.78')).toBe(true);
    });

    it('rejette un numéro commençant par 00', () => {
      expect(validateFrenchPhoneNumber('0012345678')).toBe(false);
    });

    it('rejette un numéro trop court', () => {
      expect(validateFrenchPhoneNumber('061234567')).toBe(false);
    });

    it('rejette un numéro trop long', () => {
      expect(validateFrenchPhoneNumber('06123456789')).toBe(false);
    });

    it('rejette null', () => {
      expect(validateFrenchPhoneNumber(null)).toBe(false);
    });
  });

  describe('validatePhoneNumber()', () => {
    it('valide un numéro espagnol par défaut', () => {
      expect(validatePhoneNumber('612345678')).toBe(true);
    });

    it('valide un numéro espagnol avec country=es', () => {
      expect(validatePhoneNumber('612345678', 'es')).toBe(true);
    });

    it('valide un numéro français avec country=fr', () => {
      expect(validatePhoneNumber('0612345678', 'fr')).toBe(true);
    });

    it('rejette un numéro français avec country=es', () => {
      expect(validatePhoneNumber('0612345678', 'es')).toBe(false);
    });

    it('utilise le validateur espagnol pour pays inconnu', () => {
      expect(validatePhoneNumber('612345678', 'unknown')).toBe(true);
    });

    it('rejette null', () => {
      expect(validatePhoneNumber(null)).toBe(false);
    });
  });
});

describe('Validation - Adresse', () => {
  describe('validateAddress()', () => {
    it('accepte une adresse valide', () => {
      expect(validateAddress('123 Rue de Paris')).toBe(true);
    });

    it('accepte une adresse longue', () => {
      expect(validateAddress('123 Avenue des Champs-Élysées, Bâtiment A')).toBe(true);
    });

    it('rejette une adresse trop courte', () => {
      expect(validateAddress('123')).toBe(false);
    });

    it('rejette une chaîne vide', () => {
      expect(validateAddress('')).toBe(false);
    });

    it('rejette null', () => {
      expect(validateAddress(null)).toBe(false);
    });

    it('accepte exactement 5 caractères (limite)', () => {
      expect(validateAddress('12345')).toBe(true);
    });

    it('rejette 4 caractères (juste en dessous de la limite)', () => {
      expect(validateAddress('1234')).toBe(false);
    });
  });
});

describe('Validation - Champs génériques', () => {
  describe('validateRequired()', () => {
    it('accepte une valeur non vide', () => {
      const result = validateRequired('test');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('');
    });

    it('rejette une valeur vide', () => {
      const result = validateRequired('');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('requis');
    });

    it('rejette null', () => {
      const result = validateRequired(null);
      expect(result.isValid).toBe(false);
    });

    it('rejette undefined', () => {
      const result = validateRequired(undefined);
      expect(result.isValid).toBe(false);
    });

    it('utilise le nom de champ personnalisé dans le message', () => {
      const result = validateRequired('', 'Email');
      expect(result.message).toBe('Email est requis');
    });

    it('rejette une chaîne avec uniquement des espaces', () => {
      const result = validateRequired('   ');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateMinLength()', () => {
    it('accepte une valeur de longueur suffisante', () => {
      const result = validateMinLength('test', 3);
      expect(result.isValid).toBe(true);
    });

    it('rejette une valeur trop courte', () => {
      const result = validateMinLength('ab', 3);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('au moins 3 caractères');
    });

    it('accepte exactement la longueur minimum', () => {
      const result = validateMinLength('abc', 3);
      expect(result.isValid).toBe(true);
    });

    it('rejette null', () => {
      const result = validateMinLength(null, 3);
      expect(result.isValid).toBe(false);
    });

    it('utilise le nom de champ personnalisé', () => {
      const result = validateMinLength('ab', 3, 'Nom');
      expect(result.message).toBe('Nom doit contenir au moins 3 caractères');
    });
  });

  describe('validateMaxLength()', () => {
    it('accepte une valeur de longueur acceptable', () => {
      const result = validateMaxLength('test', 10);
      expect(result.isValid).toBe(true);
    });

    it('rejette une valeur trop longue', () => {
      const result = validateMaxLength('test123456', 5);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('ne peut pas dépasser 5 caractères');
    });

    it('accepte exactement la longueur maximum', () => {
      const result = validateMaxLength('12345', 5);
      expect(result.isValid).toBe(true);
    });

    it('accepte null (pas de valeur = pas de dépassement)', () => {
      const result = validateMaxLength(null, 5);
      expect(result.isValid).toBe(true);
    });

    it('utilise le nom de champ personnalisé', () => {
      const result = validateMaxLength('test123456', 5, 'Description');
      expect(result.message).toBe('Description ne peut pas dépasser 5 caractères');
    });
  });
});

describe('Validation - Formulaire complet', () => {
  describe('validateForm()', () => {
    it('valide un formulaire correct', () => {
      const data = {
        email: 'test@example.com',
        name: 'Jean Dupont'
      };

      const rules = {
        email: [
          { validator: (val) => validateRequired(val, 'Email') },
          { validator: (val) => validateEmail(val) ? { isValid: true, message: '' } : { isValid: false, message: 'Email invalide' } }
        ],
        name: [
          { validator: (val) => validateRequired(val, 'Nom') }
        ]
      };

      const result = validateForm(data, rules);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('retourne les erreurs pour un formulaire invalide', () => {
      const data = {
        email: 'invalid-email',
        name: ''
      };

      const rules = {
        email: [
          { validator: (val) => validateRequired(val, 'Email') },
          { validator: (val) => validateEmail(val) ? { isValid: true, message: '' } : { isValid: false, message: 'Email invalide' } }
        ],
        name: [
          { validator: (val) => validateRequired(val, 'Nom') }
        ]
      };

      const result = validateForm(data, rules);

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email invalide');
      expect(result.errors.name).toBe('Nom est requis');
    });

    it('s\'arrête à la première erreur pour chaque champ', () => {
      const data = {
        password: ''
      };

      const rules = {
        password: [
          { validator: (val) => validateRequired(val, 'Mot de passe') },
          { validator: (val) => validateMinLength(val, 8, 'Mot de passe') }
        ]
      };

      const result = validateForm(data, rules);

      // Seulement l'erreur "requis" car c'est la première
      expect(result.errors.password).toBe('Mot de passe est requis');
    });
  });
});

describe('Validation - Numéros médicaux', () => {
  describe('validateAdeliNumber()', () => {
    it('accepte un numéro ADELI valide (9 chiffres)', () => {
      expect(validateAdeliNumber('123456789')).toBe(true);
    });

    it('accepte un numéro ADELI avec espaces', () => {
      expect(validateAdeliNumber('12 345 6789')).toBe(true);
    });

    it('rejette un numéro ADELI trop court', () => {
      expect(validateAdeliNumber('12345678')).toBe(false);
    });

    it('rejette un numéro ADELI trop long', () => {
      expect(validateAdeliNumber('1234567890')).toBe(false);
    });

    it('rejette un numéro ADELI avec lettres', () => {
      expect(validateAdeliNumber('12345678A')).toBe(false);
    });

    it('rejette null', () => {
      expect(validateAdeliNumber(null)).toBe(false);
    });
  });

  describe('validateRppsNumber()', () => {
    it('accepte un numéro RPPS valide (11 chiffres)', () => {
      expect(validateRppsNumber('12345678901')).toBe(true);
    });

    it('accepte un numéro RPPS avec espaces', () => {
      expect(validateRppsNumber('123 4567 8901')).toBe(true);
    });

    it('rejette un numéro RPPS trop court', () => {
      expect(validateRppsNumber('1234567890')).toBe(false);
    });

    it('rejette un numéro RPPS trop long', () => {
      expect(validateRppsNumber('123456789012')).toBe(false);
    });

    it('rejette un numéro RPPS avec lettres', () => {
      expect(validateRppsNumber('1234567890A')).toBe(false);
    });

    it('rejette null', () => {
      expect(validateRppsNumber(null)).toBe(false);
    });
  });

  describe('validateSpanishMedicalNumber()', () => {
    it('accepte un numéro de colegiado court (6 chiffres)', () => {
      expect(validateSpanishMedicalNumber('123456')).toBe(true);
    });

    it('accepte un numéro de colegiado long (10 chiffres)', () => {
      expect(validateSpanishMedicalNumber('1234567890')).toBe(true);
    });

    it('accepte un numéro avec format province/numéro', () => {
      expect(validateSpanishMedicalNumber('28/12345')).toBe(true);
    });

    it('accepte un numéro avec tiret', () => {
      expect(validateSpanishMedicalNumber('28-12345')).toBe(true);
    });

    it('rejette un numéro trop court', () => {
      expect(validateSpanishMedicalNumber('12345')).toBe(false);
    });

    it('rejette un numéro trop long', () => {
      expect(validateSpanishMedicalNumber('12345678901')).toBe(false);
    });

    it('rejette null', () => {
      expect(validateSpanishMedicalNumber(null)).toBe(false);
    });
  });

  describe('validateMedicalNumber()', () => {
    it('valide un numéro ADELI pour la France', () => {
      expect(validateMedicalNumber('123456789', 'fr')).toBe(true);
    });

    it('valide un numéro RPPS pour la France', () => {
      expect(validateMedicalNumber('12345678901', 'fr')).toBe(true);
    });

    it('valide un numéro de colegiado pour l\'Espagne', () => {
      expect(validateMedicalNumber('28/12345', 'es')).toBe(true);
    });

    it('utilise la validation espagnole par défaut', () => {
      expect(validateMedicalNumber('123456')).toBe(true);
    });

    it('utilise la validation espagnole pour pays inconnu', () => {
      expect(validateMedicalNumber('123456', 'unknown')).toBe(true);
    });

    it('rejette null', () => {
      expect(validateMedicalNumber(null)).toBe(false);
    });
  });

  describe('validateClinicName()', () => {
    it('accepte un nom de clinique simple', () => {
      expect(validateClinicName('Centre Médical')).toBe(true);
    });

    it('accepte un nom avec chiffres', () => {
      expect(validateClinicName('Clinique 123')).toBe(true);
    });

    it('accepte un nom avec tirets', () => {
      expect(validateClinicName('Centre-Médical-Paris')).toBe(true);
    });

    it('accepte un nom avec apostrophe', () => {
      expect(validateClinicName("Cabinet d'Ophtalmologie")).toBe(true);
    });

    it('accepte un nom avec accents', () => {
      expect(validateClinicName('Clínica Médica')).toBe(true);
    });

    it('rejette un nom trop court', () => {
      expect(validateClinicName('A')).toBe(false);
    });

    it('rejette un nom trop long (>100 caractères)', () => {
      const longName = 'A'.repeat(101);
      expect(validateClinicName(longName)).toBe(false);
    });

    it('rejette null', () => {
      expect(validateClinicName(null)).toBe(false);
    });

    it('accepte exactement 2 caractères (limite basse)', () => {
      expect(validateClinicName('AB')).toBe(true);
    });

    it('accepte exactement 100 caractères (limite haute)', () => {
      const maxName = 'A'.repeat(100);
      expect(validateClinicName(maxName)).toBe(true);
    });
  });
});

describe('Validation - Cas limites patients', () => {
  describe('Noms avec caractères internationaux', () => {
    // Caractères supportés par la regex actuelle
    const supportedTestCases = [
      { name: 'Müller', description: 'nom allemand avec umlaut' },
      { name: 'José', description: 'nom espagnol avec accent' },
      { name: 'François', description: 'nom français avec cédille' },
      { name: 'Niño', description: 'nom espagnol avec ñ' },
      { name: 'Naïma', description: 'nom avec tréma' }
    ];

    supportedTestCases.forEach(({ name, description }) => {
      it(`accepte ${description}: "${name}"`, () => {
        expect(validatePersonName(name)).toBe(true);
      });
    });

    // Caractères nordiques non supportés par la regex actuelle
    // (ø, å, æ scandinaves ne sont pas dans la plage À-ÿ)
    const unsupportedTestCases = [
      { name: 'Søren', description: 'nom danois avec ø (non supporté)' },
      { name: 'Björk', description: 'nom islandais avec ö' } // ö dans ö est supporté
    ];

    it('certains caractères nordiques ne sont pas supportés par la regex', () => {
      // Le ø n'est pas dans la plage [À-ÿ]
      expect(validatePersonName('Søren')).toBe(false);
    });

    it('accepte le ö islandais (dans la plage latin étendu)', () => {
      expect(validatePersonName('Björk')).toBe(true);
    });
  });

  describe('Numéros de téléphone internationaux', () => {
    it('gère les différents formats de préfixe espagnol', () => {
      expect(validateSpanishPhoneNumber('+34 612 345 678')).toBe(true);
      expect(validateSpanishPhoneNumber('34 612 345 678')).toBe(true);
      expect(validateSpanishPhoneNumber('612 345 678')).toBe(true);
    });

    it('gère les différents formats de préfixe français', () => {
      expect(validateFrenchPhoneNumber('+33 6 12 34 56 78')).toBe(true);
      expect(validateFrenchPhoneNumber('33 6 12 34 56 78')).toBe(true);
      expect(validateFrenchPhoneNumber('06 12 34 56 78')).toBe(true);
    });
  });

  describe('Emails edge cases', () => {
    it('accepte des emails avec domaines valides', () => {
      expect(validateEmail('test@gmail.com')).toBe(true);
      expect(validateEmail('test@outlook.fr')).toBe(true);
      expect(validateEmail('test@company.co.uk')).toBe(true);
    });

    it('accepte des emails professionnels', () => {
      expect(validateEmail('dr.dupont@clinique-paris.fr')).toBe(true);
      expect(validateEmail('contact@centre-medical.com')).toBe(true);
    });
  });
});
