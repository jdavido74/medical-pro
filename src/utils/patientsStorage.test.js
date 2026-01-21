// utils/patientsStorage.test.js
/**
 * Tests unitaires pour patientsStorage
 * Note: Ces tests couvrent les fonctions synchrones de manipulation des patients.
 * Les fonctions asynchrones (create, update, delete) sont testées séparément
 * en intégration car elles dépendent de l'API IP externe.
 */

import { patientsStorage } from './patientsStorage';

// Storage key used by patientsStorage
const STORAGE_KEY = 'medicalPro_patients';

describe('patientsStorage - Fonctions synchrones', () => {
  // Save original localStorage
  let originalLocalStorage;
  let mockStorage;

  beforeAll(() => {
    originalLocalStorage = window.localStorage;
  });

  afterAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  });

  beforeEach(() => {
    // Create fresh mock for each test
    mockStorage = {};
    const mockLocalStorage = {
      getItem: jest.fn((key) => mockStorage[key] || null),
      setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
      removeItem: jest.fn((key) => { delete mockStorage[key]; }),
      clear: jest.fn(() => { mockStorage = {}; })
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
  });

  describe('getAll()', () => {
    it('retourne un tableau vide si aucun patient stocké', () => {
      const patients = patientsStorage.getAll();
      expect(patients).toEqual([]);
    });

    it('retourne les patients stockés', () => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        { id: '1', firstName: 'Jean', lastName: 'Dupont' },
        { id: '2', firstName: 'Marie', lastName: 'Martin' }
      ]);

      const patients = patientsStorage.getAll();
      expect(patients).toHaveLength(2);
      expect(patients[0].firstName).toBe('Jean');
      expect(patients[1].firstName).toBe('Marie');
    });

    it('gère les erreurs JSON gracieusement', () => {
      mockStorage[STORAGE_KEY] = 'invalid json {';
      const patients = patientsStorage.getAll();
      expect(patients).toEqual([]);
    });
  });

  describe('getById()', () => {
    beforeEach(() => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        { id: 'patient-1', firstName: 'Jean', lastName: 'Dupont' },
        { id: 'patient-2', firstName: 'Marie', lastName: 'Martin' }
      ]);
    });

    it('retourne le patient correspondant à l\'ID', () => {
      const patient = patientsStorage.getById('patient-1');
      expect(patient).toBeDefined();
      expect(patient.firstName).toBe('Jean');
    });

    it('retourne undefined si patient non trouvé', () => {
      const patient = patientsStorage.getById('patient-inexistant');
      expect(patient).toBeUndefined();
    });
  });

  describe('checkDuplicate()', () => {
    beforeEach(() => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        {
          id: 'patient-1',
          firstName: 'Jean',
          lastName: 'Dupont',
          birthDate: '1980-05-15',
          patientNumber: 'P240001'
        },
        {
          id: 'patient-2',
          firstName: 'Marie',
          lastName: 'Martin',
          birthDate: '1990-03-20',
          patientNumber: 'P240002'
        }
      ]);
    });

    it('détecte un doublon avec même nom et date de naissance', () => {
      const duplicate = patientsStorage.checkDuplicate('Jean', 'Dupont', '1980-05-15');
      expect(duplicate).toBeDefined();
      expect(duplicate.patientNumber).toBe('P240001');
    });

    it('détecte un doublon insensible à la casse', () => {
      const duplicate = patientsStorage.checkDuplicate('JEAN', 'DUPONT', '1980-05-15');
      expect(duplicate).toBeDefined();
      expect(duplicate.id).toBe('patient-1');
    });

    it('ne détecte pas de doublon si nom différent', () => {
      const duplicate = patientsStorage.checkDuplicate('Pierre', 'Dupont', '1980-05-15');
      expect(duplicate).toBeUndefined();
    });

    it('ne détecte pas de doublon si date différente', () => {
      const duplicate = patientsStorage.checkDuplicate('Jean', 'Dupont', '1985-05-15');
      expect(duplicate).toBeUndefined();
    });

    it('exclut un patient par ID lors de la vérification', () => {
      const duplicate = patientsStorage.checkDuplicate('Jean', 'Dupont', '1980-05-15', 'patient-1');
      expect(duplicate).toBeUndefined();
    });

    it('détecte un doublon même avec excludeId différent', () => {
      const duplicate = patientsStorage.checkDuplicate('Jean', 'Dupont', '1980-05-15', 'patient-2');
      expect(duplicate).toBeDefined();
      expect(duplicate.id).toBe('patient-1');
    });
  });

  describe('checkDuplicateByEmailAndName()', () => {
    beforeEach(() => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        {
          id: 'patient-1',
          firstName: 'Jean',
          lastName: 'Dupont',
          contact: { email: 'jean.dupont@email.com' },
          patientNumber: 'P240001'
        },
        {
          id: 'patient-2',
          firstName: 'Marie',
          lastName: 'Martin',
          contact: { email: 'marie.martin@email.com' },
          patientNumber: 'P240002'
        }
      ]);
    });

    it('détecte un doublon par email', () => {
      const result = patientsStorage.checkDuplicateByEmailAndName('Pierre', 'Autre', 'jean.dupont@email.com');
      expect(result).toBeDefined();
      expect(result.exists).toBe(true);
      expect(result.type).toBe('email');
      expect(result.patient.patientNumber).toBe('P240001');
    });

    it('détecte un doublon par email insensible à la casse', () => {
      const result = patientsStorage.checkDuplicateByEmailAndName('Pierre', 'Autre', 'JEAN.DUPONT@EMAIL.COM');
      expect(result).toBeDefined();
      expect(result.type).toBe('email');
    });

    it('détecte un doublon par nom et prénom', () => {
      const result = patientsStorage.checkDuplicateByEmailAndName('Jean', 'Dupont', 'autre@email.com');
      expect(result).toBeDefined();
      expect(result.exists).toBe(true);
      expect(result.type).toBe('name');
    });

    it('retourne null si pas de doublon', () => {
      const result = patientsStorage.checkDuplicateByEmailAndName('Pierre', 'Nouveau', 'nouveau@email.com');
      expect(result).toBeNull();
    });

    it('priorise la détection par email sur le nom', () => {
      const result = patientsStorage.checkDuplicateByEmailAndName('Jean', 'Dupont', 'marie.martin@email.com');
      expect(result.type).toBe('email');
      expect(result.patient.patientNumber).toBe('P240002');
    });

    it('exclut un patient par ID', () => {
      const result = patientsStorage.checkDuplicateByEmailAndName('Jean', 'Dupont', 'jean.dupont@email.com', 'patient-1');
      expect(result).toBeNull();
    });
  });

  describe('generatePatientNumber()', () => {
    const currentYear = new Date().getFullYear().toString().slice(-2);

    it('génère un numéro au format P + année + séquence', () => {
      const patientNumber = patientsStorage.generatePatientNumber();
      expect(patientNumber).toMatch(new RegExp(`^P${currentYear}\\d{4}$`));
    });

    it('génère le premier numéro si aucun patient existant', () => {
      const patientNumber = patientsStorage.generatePatientNumber();
      expect(patientNumber).toBe(`P${currentYear}0001`);
    });

    it('incrémente le numéro séquentiel', () => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        { id: '1', patientNumber: `P${currentYear}0001` },
        { id: '2', patientNumber: `P${currentYear}0002` },
        { id: '3', patientNumber: `P${currentYear}0005` }
      ]);

      const patientNumber = patientsStorage.generatePatientNumber();
      expect(patientNumber).toBe(`P${currentYear}0006`);
    });

    it('ignore les numéros d\'années précédentes', () => {
      const previousYear = (parseInt(currentYear) - 1).toString().padStart(2, '0');
      mockStorage[STORAGE_KEY] = JSON.stringify([
        { id: '1', patientNumber: `P${previousYear}0099` }
      ]);

      const patientNumber = patientsStorage.generatePatientNumber();
      expect(patientNumber).toBe(`P${currentYear}0001`);
    });

    it('gère les patients sans numéro', () => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        { id: '1', firstName: 'Sans', lastName: 'Numéro' }
      ]);

      const patientNumber = patientsStorage.generatePatientNumber();
      expect(patientNumber).toBe(`P${currentYear}0001`);
    });

    it('a une longueur totale de 7 caractères', () => {
      const patientNumber = patientsStorage.generatePatientNumber();
      expect(patientNumber).toHaveLength(7);
    });
  });

  describe('search()', () => {
    beforeEach(() => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        {
          id: '1',
          firstName: 'Jean',
          lastName: 'Dupont',
          patientNumber: 'P240001',
          contact: { email: 'jean.dupont@email.com', phone: '+33612345678' }
        },
        {
          id: '2',
          firstName: 'Marie',
          lastName: 'Martin',
          patientNumber: 'P240002',
          contact: { email: 'marie.martin@email.com', phone: '+33698765432' }
        },
        {
          id: '3',
          firstName: 'Pierre',
          lastName: 'Dupont',
          patientNumber: 'P240003',
          deleted: true
        }
      ]);
    });

    it('recherche par prénom', () => {
      const results = patientsStorage.search('Jean');
      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Jean');
    });

    it('recherche par nom de famille', () => {
      const results = patientsStorage.search('Dupont');
      expect(results).toHaveLength(1); // Pierre est supprimé
      expect(results[0].firstName).toBe('Jean');
    });

    it('recherche par numéro patient', () => {
      const results = patientsStorage.search('P240002');
      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Marie');
    });

    it('recherche par email', () => {
      const results = patientsStorage.search('marie.martin@email.com');
      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Marie');
    });

    it('recherche par téléphone', () => {
      const results = patientsStorage.search('612345678');
      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Jean');
    });

    it('exclut les patients supprimés', () => {
      const results = patientsStorage.search('Pierre');
      expect(results).toHaveLength(0);
    });

    it('recherche insensible à la casse', () => {
      const results = patientsStorage.search('JEAN');
      expect(results).toHaveLength(1);
    });

    it('retourne un tableau vide si aucun résultat', () => {
      const results = patientsStorage.search('Inexistant');
      expect(results).toEqual([]);
    });
  });

  describe('getStatistics()', () => {
    it('calcule les statistiques correctement', () => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const lastYear = new Date(now.getFullYear() - 1, 6, 1);

      mockStorage[STORAGE_KEY] = JSON.stringify([
        { id: '1', gender: 'male', status: 'active', createdAt: thisMonth.toISOString() },
        { id: '2', gender: 'female', status: 'active', createdAt: thisMonth.toISOString() },
        { id: '3', gender: 'male', status: 'inactive', createdAt: lastMonth.toISOString() },
        { id: '4', gender: 'other', status: 'active', createdAt: lastYear.toISOString() },
        { id: '5', gender: 'female', status: 'active', deleted: true, createdAt: thisMonth.toISOString() }
      ]);

      const stats = patientsStorage.getStatistics();

      expect(stats.total).toBe(4); // Exclut supprimés
      expect(stats.active).toBe(3);
      expect(stats.newThisMonth).toBe(2);
      expect(stats.byGender.male).toBe(2);
      expect(stats.byGender.female).toBe(1);
      expect(stats.byGender.other).toBe(1);
    });

    it('retourne des stats à zéro si aucun patient', () => {
      const stats = patientsStorage.getStatistics();

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.newThisMonth).toBe(0);
      expect(stats.byGender.male).toBe(0);
      expect(stats.byGender.female).toBe(0);
    });
  });
});

describe('patientsStorage - Validation format numéro patient', () => {
  beforeEach(() => {
    // Clear storage
    const mockStorage = {};
    const mockLocalStorage = {
      getItem: jest.fn((key) => mockStorage[key] || null),
      setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
      removeItem: jest.fn((key) => { delete mockStorage[key]; }),
      clear: jest.fn(() => {})
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
  });

  it('format commence par P', () => {
    const patientNumber = patientsStorage.generatePatientNumber();
    expect(patientNumber[0]).toBe('P');
  });

  it('format contient l\'année sur 2 chiffres', () => {
    const patientNumber = patientsStorage.generatePatientNumber();
    const yearPart = patientNumber.substring(1, 3);
    const currentYear = new Date().getFullYear().toString().slice(-2);
    expect(yearPart).toBe(currentYear);
  });

  it('format contient le numéro séquentiel sur 4 chiffres', () => {
    const patientNumber = patientsStorage.generatePatientNumber();
    const sequencePart = patientNumber.substring(3);
    expect(sequencePart).toHaveLength(4);
    expect(parseInt(sequencePart)).toBeGreaterThan(0);
  });
});

describe('patientsStorage - Détection de doublons avancée', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    const mockLocalStorage = {
      getItem: jest.fn((key) => mockStorage[key] || null),
      setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
      removeItem: jest.fn((key) => { delete mockStorage[key]; }),
      clear: jest.fn(() => { mockStorage = {}; })
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
  });

  describe('cas limites de détection', () => {
    it('gère les noms avec accents', () => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        { id: '1', firstName: 'José', lastName: 'García', birthDate: '1990-01-01' }
      ]);

      const duplicate = patientsStorage.checkDuplicate('josé', 'garcía', '1990-01-01');
      expect(duplicate).toBeDefined();
    });

    it('gère les noms composés', () => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        { id: '1', firstName: 'Jean-Pierre', lastName: 'Dupont-Martin', birthDate: '1990-01-01' }
      ]);

      const duplicate = patientsStorage.checkDuplicate('JEAN-PIERRE', 'DUPONT-MARTIN', '1990-01-01');
      expect(duplicate).toBeDefined();
    });

    it('différencie des patients avec même nom mais dates différentes', () => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        { id: '1', firstName: 'Jean', lastName: 'Dupont', birthDate: '1990-01-01' },
        { id: '2', firstName: 'Jean', lastName: 'Dupont', birthDate: '1995-01-01' }
      ]);

      const duplicate1 = patientsStorage.checkDuplicate('Jean', 'Dupont', '1990-01-01');
      expect(duplicate1.id).toBe('1');

      const duplicate2 = patientsStorage.checkDuplicate('Jean', 'Dupont', '1995-01-01');
      expect(duplicate2.id).toBe('2');
    });
  });

  describe('détection par email', () => {
    beforeEach(() => {
      mockStorage[STORAGE_KEY] = JSON.stringify([
        { id: '1', firstName: 'Jean', lastName: 'Dupont', contact: { email: 'jean@test.com' } }
      ]);
    });

    it('détecte les doublons email avec majuscules', () => {
      const result = patientsStorage.checkDuplicateByEmailAndName('Autre', 'Nom', 'JEAN@TEST.COM');
      expect(result).not.toBeNull();
      expect(result.type).toBe('email');
    });

    it('ne gère pas les espaces autour de l\'email (comportement actuel)', () => {
      // Note: L'implémentation actuelle ne trim pas les espaces
      // Ceci documente le comportement actuel - un trim serait une amélioration
      const result = patientsStorage.checkDuplicateByEmailAndName('Autre', 'Nom', ' jean@test.com ');
      expect(result).toBeNull(); // Les espaces empêchent la détection
    });

    it('ne détecte pas de doublon si email différent', () => {
      const result = patientsStorage.checkDuplicateByEmailAndName('Autre', 'Nom', 'autre@test.com');
      expect(result).toBeNull();
    });
  });
});

describe('patientsStorage - Recherche avancée', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    const mockLocalStorage = {
      getItem: jest.fn((key) => mockStorage[key] || null),
      setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
      removeItem: jest.fn((key) => { delete mockStorage[key]; }),
      clear: jest.fn(() => { mockStorage = {}; })
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    mockStorage[STORAGE_KEY] = JSON.stringify([
      { id: '1', firstName: 'Jean-Pierre', lastName: 'Dupont-Martin', patientNumber: 'P250001', contact: { email: 'jp@email.com', phone: '+33612345678' } },
      { id: '2', firstName: 'Marie', lastName: 'García López', patientNumber: 'P250002', contact: { email: 'marie@email.es', phone: '+34612345678' } },
      { id: '3', firstName: 'Pierre', lastName: 'Test', patientNumber: 'P250003', deleted: true }
    ]);
  });

  it('recherche par partie du nom composé', () => {
    const results = patientsStorage.search('Dupont');
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Jean-Pierre');
  });

  it('recherche par numéro patient partiel', () => {
    const results = patientsStorage.search('P250002');
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Marie');
  });

  it('recherche par partie d\'email', () => {
    const results = patientsStorage.search('marie@email');
    expect(results).toHaveLength(1);
  });

  it('recherche par partie du téléphone (sans préfixe)', () => {
    const results = patientsStorage.search('612345678');
    expect(results).toHaveLength(2); // FR et ES ont le même numéro sans préfixe
  });

  it('recherche par nom avec accent', () => {
    const results = patientsStorage.search('García');
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Marie');
  });
});
