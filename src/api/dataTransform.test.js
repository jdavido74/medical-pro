// api/dataTransform.test.js
import { dataTransform } from './dataTransform';

describe('dataTransform - Conversion de clés', () => {
  describe('toCamelCase()', () => {
    it('convertit snake_case en camelCase', () => {
      expect(dataTransform.toCamelCase('first_name')).toBe('firstName');
      expect(dataTransform.toCamelCase('last_name')).toBe('lastName');
      expect(dataTransform.toCamelCase('date_of_birth')).toBe('dateOfBirth');
    });

    it('gère les chaînes sans underscore', () => {
      expect(dataTransform.toCamelCase('name')).toBe('name');
      expect(dataTransform.toCamelCase('id')).toBe('id');
    });

    it('gère les multiples underscores', () => {
      expect(dataTransform.toCamelCase('emergency_contact_phone')).toBe('emergencyContactPhone');
    });
  });

  describe('toSnakeCase()', () => {
    it('convertit camelCase en snake_case', () => {
      expect(dataTransform.toSnakeCase('firstName')).toBe('first_name');
      expect(dataTransform.toSnakeCase('lastName')).toBe('last_name');
      expect(dataTransform.toSnakeCase('dateOfBirth')).toBe('date_of_birth');
    });

    it('gère les chaînes sans majuscules', () => {
      expect(dataTransform.toSnakeCase('name')).toBe('name');
      expect(dataTransform.toSnakeCase('id')).toBe('id');
    });

    it('gère les multiples majuscules', () => {
      expect(dataTransform.toSnakeCase('emergencyContactPhone')).toBe('emergency_contact_phone');
    });
  });

  describe('transformKeysToCAamelCase()', () => {
    it('transforme toutes les clés d\'un objet', () => {
      const input = {
        first_name: 'Jean',
        last_name: 'Dupont',
        date_of_birth: '1990-01-15'
      };

      const result = dataTransform.transformKeysToCAamelCase(input);

      expect(result.firstName).toBe('Jean');
      expect(result.lastName).toBe('Dupont');
      expect(result.dateOfBirth).toBe('1990-01-15');
    });

    it('transforme les objets imbriqués', () => {
      const input = {
        patient_info: {
          first_name: 'Jean',
          emergency_contact: {
            contact_name: 'Marie'
          }
        }
      };

      const result = dataTransform.transformKeysToCAamelCase(input);

      expect(result.patientInfo.firstName).toBe('Jean');
      expect(result.patientInfo.emergencyContact.contactName).toBe('Marie');
    });

    it('transforme les tableaux d\'objets', () => {
      const input = [
        { first_name: 'Jean' },
        { first_name: 'Marie' }
      ];

      const result = dataTransform.transformKeysToCAamelCase(input);

      expect(result[0].firstName).toBe('Jean');
      expect(result[1].firstName).toBe('Marie');
    });

    it('préserve les valeurs primitives', () => {
      expect(dataTransform.transformKeysToCAamelCase('test')).toBe('test');
      expect(dataTransform.transformKeysToCAamelCase(123)).toBe(123);
      expect(dataTransform.transformKeysToCAamelCase(null)).toBe(null);
    });
  });

  describe('transformKeysToSnakeCase()', () => {
    it('transforme toutes les clés d\'un objet', () => {
      const input = {
        firstName: 'Jean',
        lastName: 'Dupont',
        dateOfBirth: '1990-01-15'
      };

      const result = dataTransform.transformKeysToSnakeCase(input);

      expect(result.first_name).toBe('Jean');
      expect(result.last_name).toBe('Dupont');
      expect(result.date_of_birth).toBe('1990-01-15');
    });
  });
});

describe('dataTransform - Transformation Patient', () => {
  describe('transformPatientFromBackend()', () => {
    it('retourne null si patient est null', () => {
      expect(dataTransform.transformPatientFromBackend(null)).toBeNull();
    });

    it('transforme les champs de base', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        birth_date: '1990-01-15',
        gender: 'male',
        patient_number: 'P240001'
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.id).toBe('uuid-123');
      expect(result.firstName).toBe('Jean');
      expect(result.lastName).toBe('Dupont');
      expect(result.birthDate).toBe('1990-01-15');
      expect(result.gender).toBe('male');
      expect(result.patientNumber).toBe('P240001');
    });

    it('supporte date_of_birth comme alternative à birth_date', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        date_of_birth: '1990-01-15'
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.birthDate).toBe('1990-01-15');
      expect(result.dateOfBirth).toBe('1990-01-15');
    });

    it('crée la structure address correctement', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        address_line1: '123 Rue de Paris',
        address_line2: 'Apt 4B',
        city: 'Paris',
        postal_code: '75001',
        country: 'France'
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.address.street).toBe('123 Rue de Paris');
      expect(result.address.line2).toBe('Apt 4B');
      expect(result.address.city).toBe('Paris');
      expect(result.address.postalCode).toBe('75001');
      expect(result.address.country).toBe('France');
    });

    it('crée la structure contact correctement', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean.dupont@email.com',
        phone: '+33612345678',
        mobile: '+33698765432',
        emergency_contact_name: 'Marie Dupont',
        emergency_contact_phone: '+33600000000',
        emergency_contact_relationship: 'Épouse'
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.contact.email).toBe('jean.dupont@email.com');
      expect(result.contact.phone).toBe('+33612345678');
      expect(result.contact.mobile).toBe('+33698765432');
      expect(result.contact.emergencyContact.name).toBe('Marie Dupont');
      expect(result.contact.emergencyContact.phone).toBe('+33600000000');
      expect(result.contact.emergencyContact.relationship).toBe('Épouse');
    });

    it('supporte emergency_contact comme objet', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        emergency_contact: {
          name: 'Marie Dupont',
          phone: '+33600000000',
          relationship: 'Épouse'
        }
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.contact.emergencyContact.name).toBe('Marie Dupont');
    });

    it('crée la structure insurance correctement', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        insurance_provider: 'CPAM',
        insurance_number: '123456789',
        coverage_type: 'Régime général'
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.insurance.provider).toBe('CPAM');
      expect(result.insurance.number).toBe('123456789');
      expect(result.insurance.type).toBe('Régime général');
    });

    it('supporte insurance_info comme objet', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        insurance_info: {
          provider: 'CPAM',
          number: '123456789',
          type: 'Régime général'
        }
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.insurance.provider).toBe('CPAM');
    });

    it('convertit les allergies string en array', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        allergies: 'Pénicilline, Aspirine, Latex'
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(Array.isArray(result.allergies)).toBe(true);
      expect(result.allergies).toHaveLength(3);
      expect(result.allergies).toContain('Pénicilline');
      expect(result.allergies).toContain('Aspirine');
      expect(result.allergies).toContain('Latex');
    });

    it('préserve les allergies array', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        allergies: ['Pénicilline', 'Aspirine']
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.allergies).toEqual(['Pénicilline', 'Aspirine']);
    });

    it('convertit les médicaments string en array', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        current_medications: 'Doliprane, Aspirine'
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(Array.isArray(result.currentMedications)).toBe(true);
      expect(result.currentMedications).toContain('Doliprane');
    });

    it('mappe is_active en status', () => {
      const activePatient = {
        id: 'uuid-1',
        first_name: 'Jean',
        last_name: 'Dupont',
        is_active: true
      };

      const inactivePatient = {
        id: 'uuid-2',
        first_name: 'Marie',
        last_name: 'Martin',
        is_active: false
      };

      expect(dataTransform.transformPatientFromBackend(activePatient).status).toBe('active');
      expect(dataTransform.transformPatientFromBackend(inactivePatient).status).toBe('inactive');
    });

    it('transforme les timestamps', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-03-20T14:45:00Z'
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.createdAt).toBe('2024-01-15T10:30:00Z');
      expect(result.updatedAt).toBe('2024-03-20T14:45:00Z');
    });
  });

  describe('transformPatientToBackend()', () => {
    it('retourne null si patient est null', () => {
      expect(dataTransform.transformPatientToBackend(null)).toBeNull();
    });

    it('transforme les champs requis', () => {
      const frontendPatient = {
        firstName: 'Jean',
        lastName: 'Dupont',
        contact: {
          email: 'jean.dupont@email.com',
          phone: '+33612345678'
        }
      };

      const result = dataTransform.transformPatientToBackend(frontendPatient);

      expect(result.first_name).toBe('Jean');
      expect(result.last_name).toBe('Dupont');
      expect(result.email).toBe('jean.dupont@email.com');
      expect(result.phone).toBe('+33612345678');
    });

    it('transforme les champs optionnels d\'identité', () => {
      const frontendPatient = {
        firstName: 'Jean',
        lastName: 'Dupont',
        birthDate: '1990-01-15',
        gender: 'male',
        nationality: 'Française',
        patientNumber: 'P240001',
        contact: {
          email: 'jean@email.com',
          phone: '+33600000000'
        }
      };

      const result = dataTransform.transformPatientToBackend(frontendPatient);

      expect(result.birth_date).toBe('1990-01-15');
      expect(result.date_of_birth).toBe('1990-01-15');
      expect(result.gender).toBe('male');
      expect(result.nationality).toBe('Française');
      expect(result.patient_number).toBe('P240001');
    });

    it('transforme l\'adresse', () => {
      const frontendPatient = {
        firstName: 'Jean',
        lastName: 'Dupont',
        address: {
          street: '123 Rue de Paris',
          line2: 'Apt 4B',
          city: 'Paris',
          postalCode: '75001',
          country: 'France'
        },
        contact: {
          email: 'jean@email.com',
          phone: '+33600000000'
        }
      };

      const result = dataTransform.transformPatientToBackend(frontendPatient);

      expect(result.address_line1).toBe('123 Rue de Paris');
      expect(result.address_line2).toBe('Apt 4B');
      expect(result.city).toBe('Paris');
      expect(result.postal_code).toBe('75001');
      expect(result.country).toBe('France');
    });

    it('transforme le contact d\'urgence', () => {
      const frontendPatient = {
        firstName: 'Jean',
        lastName: 'Dupont',
        contact: {
          email: 'jean@email.com',
          phone: '+33600000000',
          emergencyContact: {
            name: 'Marie Dupont',
            phone: '+33611111111',
            relationship: 'Épouse'
          }
        }
      };

      const result = dataTransform.transformPatientToBackend(frontendPatient);

      expect(result.emergency_contact_name).toBe('Marie Dupont');
      expect(result.emergency_contact_phone).toBe('+33611111111');
      expect(result.emergency_contact_relationship).toBe('Épouse');
    });

    it('transforme l\'assurance', () => {
      const frontendPatient = {
        firstName: 'Jean',
        lastName: 'Dupont',
        insurance: {
          provider: 'CPAM',
          number: '123456789',
          mutual: 'AG2R',
          mutualNumber: 'MUT123'
        },
        contact: {
          email: 'jean@email.com',
          phone: '+33600000000'
        }
      };

      const result = dataTransform.transformPatientToBackend(frontendPatient);

      expect(result.insurance_provider).toBe('CPAM');
      expect(result.insurance_number).toBe('123456789');
      expect(result.mutual_insurance).toBe('AG2R');
      expect(result.mutual_number).toBe('MUT123');
    });

    it('convertit les allergies array en string', () => {
      const frontendPatient = {
        firstName: 'Jean',
        lastName: 'Dupont',
        allergies: ['Pénicilline', 'Aspirine', 'Latex'],
        contact: {
          email: 'jean@email.com',
          phone: '+33600000000'
        }
      };

      const result = dataTransform.transformPatientToBackend(frontendPatient);

      expect(result.allergies).toBe('Pénicilline, Aspirine, Latex');
    });

    it('convertit les médicaments array en string', () => {
      const frontendPatient = {
        firstName: 'Jean',
        lastName: 'Dupont',
        currentMedications: ['Doliprane', 'Aspirine'],
        contact: {
          email: 'jean@email.com',
          phone: '+33600000000'
        }
      };

      const result = dataTransform.transformPatientToBackend(frontendPatient);

      expect(result.current_medications).toBe('Doliprane, Aspirine');
    });

    it('mappe status en is_active', () => {
      const activePatient = {
        firstName: 'Jean',
        lastName: 'Dupont',
        status: 'active',
        contact: {
          email: 'jean@email.com',
          phone: '+33600000000'
        }
      };

      const inactivePatient = {
        firstName: 'Marie',
        lastName: 'Martin',
        status: 'inactive',
        contact: {
          email: 'marie@email.com',
          phone: '+33600000001'
        }
      };

      expect(dataTransform.transformPatientToBackend(activePatient).is_active).toBe(true);
      expect(dataTransform.transformPatientToBackend(inactivePatient).is_active).toBe(false);
    });

    it('supprime les valeurs vides', () => {
      const frontendPatient = {
        firstName: 'Jean',
        lastName: 'Dupont',
        birthDate: '',
        gender: null,
        allergies: [],
        notes: undefined,
        contact: {
          email: 'jean@email.com',
          phone: '+33600000000'
        }
      };

      const result = dataTransform.transformPatientToBackend(frontendPatient);

      expect(result.birth_date).toBeUndefined();
      expect(result.gender).toBeUndefined();
      expect(result.allergies).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });

    it('trim les valeurs string', () => {
      const frontendPatient = {
        firstName: '  Jean  ',
        lastName: '  Dupont  ',
        contact: {
          email: '  jean@email.com  ',
          phone: '  +33600000000  '
        }
      };

      const result = dataTransform.transformPatientToBackend(frontendPatient);

      expect(result.first_name).toBe('Jean');
      expect(result.last_name).toBe('Dupont');
      expect(result.email).toBe('jean@email.com');
      expect(result.phone).toBe('+33600000000');
    });
  });

  describe('transformPatientListFromBackend()', () => {
    it('retourne un tableau vide si input n\'est pas un array', () => {
      expect(dataTransform.transformPatientListFromBackend(null)).toEqual([]);
      expect(dataTransform.transformPatientListFromBackend(undefined)).toEqual([]);
      expect(dataTransform.transformPatientListFromBackend('not an array')).toEqual([]);
    });

    it('transforme une liste de patients', () => {
      const backendPatients = [
        { id: '1', first_name: 'Jean', last_name: 'Dupont' },
        { id: '2', first_name: 'Marie', last_name: 'Martin' }
      ];

      const result = dataTransform.transformPatientListFromBackend(backendPatients);

      expect(result).toHaveLength(2);
      expect(result[0].firstName).toBe('Jean');
      expect(result[1].firstName).toBe('Marie');
    });
  });

  describe('unwrapResponse()', () => {
    it('extrait data de la réponse wrapper', () => {
      const response = {
        success: true,
        data: { firstName: 'Jean' }
      };

      const result = dataTransform.unwrapResponse(response);

      expect(result).toEqual({ firstName: 'Jean' });
    });

    it('retourne la réponse directement si pas de wrapper', () => {
      const response = { firstName: 'Jean' };

      const result = dataTransform.unwrapResponse(response);

      expect(result).toEqual({ firstName: 'Jean' });
    });

    it('gère data = null correctement', () => {
      const response = { success: true, data: null };

      const result = dataTransform.unwrapResponse(response);

      expect(result).toBeNull();
    });
  });
});

describe('dataTransform - Roundtrip Patient', () => {
  it('préserve les données lors d\'un aller-retour complet', () => {
    const originalFrontend = {
      firstName: 'Jean',
      lastName: 'Dupont',
      birthDate: '1990-01-15',
      gender: 'male',
      patientNumber: 'P240001',
      address: {
        street: '123 Rue de Paris',
        city: 'Paris',
        postalCode: '75001',
        country: 'France'
      },
      contact: {
        email: 'jean.dupont@email.com',
        phone: '+33612345678',
        emergencyContact: {
          name: 'Marie Dupont',
          phone: '+33600000000',
          relationship: 'Épouse'
        }
      },
      insurance: {
        provider: 'CPAM',
        number: '123456789'
      },
      allergies: ['Pénicilline', 'Aspirine'],
      currentMedications: ['Doliprane'],
      bloodType: 'A+',
      status: 'active',
      notes: 'Patient suivi pour hypertension'
    };

    // Frontend -> Backend
    const backendData = dataTransform.transformPatientToBackend(originalFrontend);

    // Simuler ce que le backend renverrait (avec timestamps)
    const backendResponse = {
      ...backendData,
      id: 'uuid-generated',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      is_active: true
    };

    // Backend -> Frontend
    const resultFrontend = dataTransform.transformPatientFromBackend(backendResponse);

    // Vérifications
    expect(resultFrontend.firstName).toBe(originalFrontend.firstName);
    expect(resultFrontend.lastName).toBe(originalFrontend.lastName);
    expect(resultFrontend.birthDate).toBe(originalFrontend.birthDate);
    expect(resultFrontend.gender).toBe(originalFrontend.gender);
    expect(resultFrontend.patientNumber).toBe(originalFrontend.patientNumber);
    expect(resultFrontend.address.street).toBe(originalFrontend.address.street);
    expect(resultFrontend.address.city).toBe(originalFrontend.address.city);
    expect(resultFrontend.contact.email).toBe(originalFrontend.contact.email);
    expect(resultFrontend.contact.phone).toBe(originalFrontend.contact.phone);
    expect(resultFrontend.contact.emergencyContact.name).toBe(originalFrontend.contact.emergencyContact.name);
    expect(resultFrontend.insurance.provider).toBe(originalFrontend.insurance.provider);
    expect(resultFrontend.bloodType).toBe(originalFrontend.bloodType);
    expect(resultFrontend.status).toBe(originalFrontend.status);
    expect(resultFrontend.notes).toBe(originalFrontend.notes);
  });

  it('gère un patient minimal (champs requis uniquement)', () => {
    const minimalPatient = {
      firstName: 'Test',
      lastName: 'Minimal',
      contact: {
        email: 'test@test.com',
        phone: '+33600000000'
      }
    };

    const backendData = dataTransform.transformPatientToBackend(minimalPatient);
    const backendResponse = {
      id: 'uuid-123',
      first_name: backendData.first_name,
      last_name: backendData.last_name,
      email: backendData.email,
      phone: backendData.phone,
      is_active: true
    };

    const result = dataTransform.transformPatientFromBackend(backendResponse);

    expect(result.firstName).toBe('Test');
    expect(result.lastName).toBe('Minimal');
    expect(result.contact.email).toBe('test@test.com');
    expect(result.status).toBe('active');
  });
});

describe('dataTransform - Cas limites Patient', () => {
  describe('gestion des valeurs null/undefined', () => {
    it('gère les champs contact manquants', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont'
        // Pas de email, phone, etc.
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.contact.email).toBeUndefined();
      expect(result.contact.phone).toBeUndefined();
    });

    it('gère les allergies null', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        allergies: null
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.allergies).toEqual([]);
    });

    it('gère les chaînes vides dans les allergies', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        allergies: 'Pénicilline, , Aspirine, '
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.allergies).toEqual(['Pénicilline', 'Aspirine']);
    });
  });

  describe('compatibilité avec différents formats backend', () => {
    it('gère social_security_number vs id_number', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        social_security_number: '1900175123456'
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.idNumber).toBe('1900175123456');
      expect(result.socialSecurityNumber).toBe('1900175123456');
    });

    it('gère les deux formats de date de naissance', () => {
      const patient1 = dataTransform.transformPatientFromBackend({
        id: '1',
        first_name: 'Jean',
        last_name: 'Dupont',
        birth_date: '1990-01-15'
      });

      const patient2 = dataTransform.transformPatientFromBackend({
        id: '2',
        first_name: 'Marie',
        last_name: 'Martin',
        date_of_birth: '1985-03-20'
      });

      expect(patient1.birthDate).toBe('1990-01-15');
      expect(patient2.birthDate).toBe('1985-03-20');
    });
  });

  describe('données médicales', () => {
    it('préserve medical_history comme objet', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        medical_history: {
          conditions: ['Hypertension'],
          surgeries: ['Appendicectomie 2010']
        }
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.medicalHistory.conditions).toContain('Hypertension');
      expect(result.medicalHistory.surgeries).toContain('Appendicectomie 2010');
    });

    it('transforme blood_type en bloodType', () => {
      const backendPatient = {
        id: 'uuid-123',
        first_name: 'Jean',
        last_name: 'Dupont',
        blood_type: 'AB+'
      };

      const result = dataTransform.transformPatientFromBackend(backendPatient);

      expect(result.bloodType).toBe('AB+');
    });
  });
});
