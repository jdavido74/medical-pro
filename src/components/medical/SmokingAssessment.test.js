// SmokingAssessment.test.js
// Tests unitaires pour les seuils d'évaluation du tabagisme

import {
  calculatePackYears,
  getExposureLevel,
  generateHealthAlerts
} from './SmokingAssessment';

describe('SmokingAssessment - Calculs et seuils', () => {

  // ============================================
  // Tests pour calculatePackYears
  // ============================================
  describe('calculatePackYears', () => {

    test('retourne 0 si cigarettesPerDay est null ou undefined', () => {
      expect(calculatePackYears(null, 10)).toBe(0);
      expect(calculatePackYears(undefined, 10)).toBe(0);
    });

    test('retourne 0 si yearsSmoking est null ou undefined', () => {
      expect(calculatePackYears(20, null)).toBe(0);
      expect(calculatePackYears(20, undefined)).toBe(0);
    });

    test('retourne 0 si les deux valeurs sont 0', () => {
      expect(calculatePackYears(0, 0)).toBe(0);
    });

    test('calcule correctement: 20 cig/jour pendant 10 ans = 10 PA', () => {
      // 20 cigarettes = 1 paquet, donc 1 * 10 = 10 PA
      expect(calculatePackYears(20, 10)).toBe(10);
    });

    test('calcule correctement: 10 cig/jour pendant 20 ans = 10 PA', () => {
      // 10 cigarettes = 0.5 paquet, donc 0.5 * 20 = 10 PA
      expect(calculatePackYears(10, 20)).toBe(10);
    });

    test('calcule correctement: 40 cig/jour pendant 15 ans = 30 PA', () => {
      // 40 cigarettes = 2 paquets, donc 2 * 15 = 30 PA
      expect(calculatePackYears(40, 15)).toBe(30);
    });

    test('calcule correctement: 5 cig/jour pendant 4 ans = 1 PA', () => {
      // 5 cigarettes = 0.25 paquet, donc 0.25 * 4 = 1 PA
      expect(calculatePackYears(5, 4)).toBe(1);
    });

    test('arrondit à 1 décimale: 15 cig/jour pendant 7 ans = 5.3 PA', () => {
      // 15 cigarettes = 0.75 paquet, donc 0.75 * 7 = 5.25 -> arrondi à 5.3
      expect(calculatePackYears(15, 7)).toBe(5.3);
    });

    test('arrondit à 1 décimale: 12 cig/jour pendant 3 ans = 1.8 PA', () => {
      // 12 cigarettes = 0.6 paquet, donc 0.6 * 3 = 1.8 PA
      expect(calculatePackYears(12, 3)).toBe(1.8);
    });

    test('gère les valeurs décimales en entrée', () => {
      expect(calculatePackYears(20.5, 10)).toBeCloseTo(10.3, 1);
    });
  });

  // ============================================
  // Tests pour getExposureLevel
  // ============================================
  describe('getExposureLevel', () => {

    // Seuil "low" : < 5 PA
    describe('niveau "low" (< 5 PA)', () => {
      test('0 PA -> low', () => {
        expect(getExposureLevel(0)).toBe('low');
      });

      test('1 PA -> low', () => {
        expect(getExposureLevel(1)).toBe('low');
      });

      test('4.9 PA -> low', () => {
        expect(getExposureLevel(4.9)).toBe('low');
      });
    });

    // Seuil "moderate" : >= 5 et < 10 PA
    describe('niveau "moderate" (5-9.9 PA)', () => {
      test('5 PA -> moderate (seuil bas)', () => {
        expect(getExposureLevel(5)).toBe('moderate');
      });

      test('7.5 PA -> moderate', () => {
        expect(getExposureLevel(7.5)).toBe('moderate');
      });

      test('9.9 PA -> moderate (seuil haut)', () => {
        expect(getExposureLevel(9.9)).toBe('moderate');
      });
    });

    // Seuil "high" : >= 10 et < 20 PA
    describe('niveau "high" (10-19.9 PA)', () => {
      test('10 PA -> high (seuil bas)', () => {
        expect(getExposureLevel(10)).toBe('high');
      });

      test('15 PA -> high', () => {
        expect(getExposureLevel(15)).toBe('high');
      });

      test('19.9 PA -> high (seuil haut)', () => {
        expect(getExposureLevel(19.9)).toBe('high');
      });
    });

    // Seuil "very_high" : >= 20 PA
    describe('niveau "very_high" (>= 20 PA)', () => {
      test('20 PA -> very_high (seuil)', () => {
        expect(getExposureLevel(20)).toBe('very_high');
      });

      test('25 PA -> very_high', () => {
        expect(getExposureLevel(25)).toBe('very_high');
      });

      test('50 PA -> very_high', () => {
        expect(getExposureLevel(50)).toBe('very_high');
      });

      test('100 PA -> very_high', () => {
        expect(getExposureLevel(100)).toBe('very_high');
      });
    });
  });

  // ============================================
  // Tests pour generateHealthAlerts
  // ============================================
  describe('generateHealthAlerts', () => {

    // Test: Non-fumeur - aucune alerte
    describe('non-fumeur (status: "never")', () => {
      test('ne génère aucune alerte pour un non-fumeur', () => {
        const smokingData = {
          status: 'never',
          cigarettesPerDay: 0,
          packYears: 0
        };
        const alerts = generateHealthAlerts(smokingData, 50);
        expect(alerts).toHaveLength(0);
      });

      test('ne génère aucune alerte même avec des données incohérentes', () => {
        const smokingData = {
          status: 'never',
          cigarettesPerDay: 20, // Incohérent mais status prime
          packYears: 30
        };
        const alerts = generateHealthAlerts(smokingData, 60);
        expect(alerts).toHaveLength(0);
      });
    });

    // Tests: Alertes respiratoires
    describe('alertes respiratoires', () => {
      test('pas d\'alerte respiratoire si PA < 10', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 5,
          packYears: 9
        };
        const alerts = generateHealthAlerts(smokingData, 40);
        const respiratoryAlerts = alerts.filter(a => a.type === 'respiratory');
        expect(respiratoryAlerts).toHaveLength(0);
      });

      test('alerte "respiratoryRisk" si PA >= 10 et < 20', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 5,
          packYears: 10
        };
        const alerts = generateHealthAlerts(smokingData, 40);
        const respiratoryAlerts = alerts.filter(a => a.type === 'respiratory');
        expect(respiratoryAlerts).toHaveLength(1);
        expect(respiratoryAlerts[0].key).toBe('respiratoryRisk');
        expect(respiratoryAlerts[0].severity).toBe('moderate');
      });

      test('alerte "respiratoryMonitoring" si PA >= 20', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 20,
          packYears: 20
        };
        const alerts = generateHealthAlerts(smokingData, 50);
        const respiratoryAlerts = alerts.filter(a => a.type === 'respiratory');
        expect(respiratoryAlerts).toHaveLength(1);
        expect(respiratoryAlerts[0].key).toBe('respiratoryMonitoring');
        expect(respiratoryAlerts[0].severity).toBe('high');
      });

      test('alerte respiratoire aussi pour ex-fumeur', () => {
        const smokingData = {
          status: 'former',
          cigarettesPerDay: 20,
          packYears: 25
        };
        const alerts = generateHealthAlerts(smokingData, 55);
        const respiratoryAlerts = alerts.filter(a => a.type === 'respiratory');
        expect(respiratoryAlerts).toHaveLength(1);
        expect(respiratoryAlerts[0].key).toBe('respiratoryMonitoring');
      });
    });

    // Tests: Alertes cardiovasculaires
    describe('alertes cardiovasculaires (fumeur actuel uniquement)', () => {
      test('pas d\'alerte cardiovasculaire si cig/jour < 10', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 9,
          packYears: 5
        };
        const alerts = generateHealthAlerts(smokingData, 40);
        const cardioAlerts = alerts.filter(a => a.type === 'cardiovascular');
        expect(cardioAlerts).toHaveLength(0);
      });

      test('alerte "cardiovascularSignificant" si cig/jour >= 10 et < 20', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 10,
          packYears: 5
        };
        const alerts = generateHealthAlerts(smokingData, 40);
        const cardioAlerts = alerts.filter(a => a.type === 'cardiovascular');
        expect(cardioAlerts).toHaveLength(1);
        expect(cardioAlerts[0].key).toBe('cardiovascularSignificant');
        expect(cardioAlerts[0].severity).toBe('moderate');
      });

      test('alerte "cardiovascularSignificant" si cig/jour = 15', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 15,
          packYears: 7.5
        };
        const alerts = generateHealthAlerts(smokingData, 40);
        const cardioAlerts = alerts.filter(a => a.type === 'cardiovascular');
        expect(cardioAlerts).toHaveLength(1);
        expect(cardioAlerts[0].key).toBe('cardiovascularSignificant');
      });

      test('alerte "cardiovascularMajor" si cig/jour >= 20', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 20,
          packYears: 10
        };
        const alerts = generateHealthAlerts(smokingData, 45);
        const cardioAlerts = alerts.filter(a => a.type === 'cardiovascular');
        expect(cardioAlerts).toHaveLength(1);
        expect(cardioAlerts[0].key).toBe('cardiovascularMajor');
        expect(cardioAlerts[0].severity).toBe('high');
      });

      test('pas d\'alerte cardiovasculaire pour ex-fumeur', () => {
        const smokingData = {
          status: 'former',
          cigarettesPerDay: 30, // Ancien fumeur avec historique élevé
          packYears: 15
        };
        const alerts = generateHealthAlerts(smokingData, 50);
        const cardioAlerts = alerts.filter(a => a.type === 'cardiovascular');
        expect(cardioAlerts).toHaveLength(0);
      });
    });

    // Tests: Alertes dépendance nicotinique
    describe('alertes dépendance nicotinique (fumeur actuel uniquement)', () => {
      test('pas d\'alerte dépendance si cig/jour <= 10', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 10,
          packYears: 5
        };
        const alerts = generateHealthAlerts(smokingData, 40);
        const dependenceAlerts = alerts.filter(a => a.type === 'dependence');
        expect(dependenceAlerts).toHaveLength(0);
      });

      test('alerte "nicotineDependenceProbable" si cig/jour > 10 et <= 20', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 11,
          packYears: 5
        };
        const alerts = generateHealthAlerts(smokingData, 40);
        const dependenceAlerts = alerts.filter(a => a.type === 'dependence');
        expect(dependenceAlerts).toHaveLength(1);
        expect(dependenceAlerts[0].key).toBe('nicotineDependenceProbable');
        expect(dependenceAlerts[0].severity).toBe('moderate');
      });

      test('alerte "nicotineDependenceProbable" si cig/jour = 20', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 20,
          packYears: 10
        };
        const alerts = generateHealthAlerts(smokingData, 45);
        const dependenceAlerts = alerts.filter(a => a.type === 'dependence');
        expect(dependenceAlerts).toHaveLength(1);
        expect(dependenceAlerts[0].key).toBe('nicotineDependenceProbable');
      });

      test('alerte "nicotineDependenceStrong" si cig/jour > 20', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 21,
          packYears: 10
        };
        const alerts = generateHealthAlerts(smokingData, 45);
        const dependenceAlerts = alerts.filter(a => a.type === 'dependence');
        expect(dependenceAlerts).toHaveLength(1);
        expect(dependenceAlerts[0].key).toBe('nicotineDependenceStrong');
        expect(dependenceAlerts[0].severity).toBe('high');
      });

      test('alerte "nicotineDependenceStrong" si cig/jour = 40', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 40,
          packYears: 20
        };
        const alerts = generateHealthAlerts(smokingData, 50);
        const dependenceAlerts = alerts.filter(a => a.type === 'dependence');
        expect(dependenceAlerts).toHaveLength(1);
        expect(dependenceAlerts[0].key).toBe('nicotineDependenceStrong');
      });

      test('pas d\'alerte dépendance pour ex-fumeur', () => {
        const smokingData = {
          status: 'former',
          cigarettesPerDay: 30,
          packYears: 15
        };
        const alerts = generateHealthAlerts(smokingData, 50);
        const dependenceAlerts = alerts.filter(a => a.type === 'dependence');
        expect(dependenceAlerts).toHaveLength(0);
      });
    });

    // Tests: Alerte dépistage
    describe('alerte orientation dépistage', () => {
      test('pas d\'alerte si PA < 20', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 20,
          packYears: 19
        };
        const alerts = generateHealthAlerts(smokingData, 55);
        const screeningAlerts = alerts.filter(a => a.type === 'screening');
        expect(screeningAlerts).toHaveLength(0);
      });

      test('pas d\'alerte si âge < 50', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 20,
          packYears: 25
        };
        const alerts = generateHealthAlerts(smokingData, 49);
        const screeningAlerts = alerts.filter(a => a.type === 'screening');
        expect(screeningAlerts).toHaveLength(0);
      });

      test('alerte "screeningDiscussion" si PA >= 20 ET âge >= 50', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 20,
          packYears: 20
        };
        const alerts = generateHealthAlerts(smokingData, 50);
        const screeningAlerts = alerts.filter(a => a.type === 'screening');
        expect(screeningAlerts).toHaveLength(1);
        expect(screeningAlerts[0].key).toBe('screeningDiscussion');
        expect(screeningAlerts[0].severity).toBe('info');
      });

      test('alerte dépistage aussi pour ex-fumeur', () => {
        const smokingData = {
          status: 'former',
          cigarettesPerDay: 20,
          packYears: 30
        };
        const alerts = generateHealthAlerts(smokingData, 60);
        const screeningAlerts = alerts.filter(a => a.type === 'screening');
        expect(screeningAlerts).toHaveLength(1);
        expect(screeningAlerts[0].key).toBe('screeningDiscussion');
      });

      test('alerte dépistage avec âge limite 50', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 20,
          packYears: 20
        };
        const alerts = generateHealthAlerts(smokingData, 50);
        const screeningAlerts = alerts.filter(a => a.type === 'screening');
        expect(screeningAlerts).toHaveLength(1);
      });

      test('pas d\'alerte dépistage si âge est null', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 20,
          packYears: 30
        };
        const alerts = generateHealthAlerts(smokingData, null);
        const screeningAlerts = alerts.filter(a => a.type === 'screening');
        expect(screeningAlerts).toHaveLength(0);
      });
    });

    // Tests: Combinaisons d'alertes
    describe('combinaisons d\'alertes', () => {
      test('fumeur lourd génère toutes les alertes appropriées', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 40,  // > 20 -> cardio majeur + dépendance forte
          packYears: 30         // >= 20 -> respiratoire monitoring
        };
        const alerts = generateHealthAlerts(smokingData, 55); // >= 50 -> screening

        expect(alerts.length).toBeGreaterThanOrEqual(4);

        const types = alerts.map(a => a.type);
        expect(types).toContain('respiratory');
        expect(types).toContain('cardiovascular');
        expect(types).toContain('dependence');
        expect(types).toContain('screening');
      });

      test('fumeur modéré génère alertes appropriées', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 15,  // >= 10 -> cardio significant, > 10 -> dépendance probable
          packYears: 12         // >= 10 -> respiratoire risk
        };
        const alerts = generateHealthAlerts(smokingData, 45); // < 50 -> pas de screening

        const types = alerts.map(a => a.type);
        expect(types).toContain('respiratory');
        expect(types).toContain('cardiovascular');
        expect(types).toContain('dependence');
        expect(types).not.toContain('screening');
      });

      test('ex-fumeur avec historique important', () => {
        const smokingData = {
          status: 'former',
          cigarettesPerDay: 30,
          packYears: 25
        };
        const alerts = generateHealthAlerts(smokingData, 55);

        const types = alerts.map(a => a.type);
        // Ex-fumeur: respiratoire + screening, mais PAS cardio ni dépendance
        expect(types).toContain('respiratory');
        expect(types).toContain('screening');
        expect(types).not.toContain('cardiovascular');
        expect(types).not.toContain('dependence');
      });

      test('jeune fumeur léger - peu d\'alertes', () => {
        const smokingData = {
          status: 'current',
          cigarettesPerDay: 5,
          packYears: 2
        };
        const alerts = generateHealthAlerts(smokingData, 25);

        // Pas assez de PA ni de cig/jour pour déclencher des alertes
        expect(alerts).toHaveLength(0);
      });
    });
  });

  // ============================================
  // Tests de validation des valeurs limites
  // ============================================
  describe('valeurs limites (boundary testing)', () => {

    test('PA = 4.99 -> low', () => {
      expect(getExposureLevel(4.99)).toBe('low');
    });

    test('PA = 5.00 -> moderate', () => {
      expect(getExposureLevel(5.00)).toBe('moderate');
    });

    test('PA = 9.99 -> moderate', () => {
      expect(getExposureLevel(9.99)).toBe('moderate');
    });

    test('PA = 10.00 -> high', () => {
      expect(getExposureLevel(10.00)).toBe('high');
    });

    test('PA = 19.99 -> high', () => {
      expect(getExposureLevel(19.99)).toBe('high');
    });

    test('PA = 20.00 -> very_high', () => {
      expect(getExposureLevel(20.00)).toBe('very_high');
    });

    test('cig/jour = 9 ne déclenche pas cardio', () => {
      const smokingData = { status: 'current', cigarettesPerDay: 9, packYears: 5 };
      const alerts = generateHealthAlerts(smokingData, 40);
      expect(alerts.filter(a => a.type === 'cardiovascular')).toHaveLength(0);
    });

    test('cig/jour = 10 déclenche cardio significant', () => {
      const smokingData = { status: 'current', cigarettesPerDay: 10, packYears: 5 };
      const alerts = generateHealthAlerts(smokingData, 40);
      const cardio = alerts.find(a => a.type === 'cardiovascular');
      expect(cardio?.key).toBe('cardiovascularSignificant');
    });

    test('cig/jour = 19 déclenche cardio significant', () => {
      const smokingData = { status: 'current', cigarettesPerDay: 19, packYears: 10 };
      const alerts = generateHealthAlerts(smokingData, 40);
      const cardio = alerts.find(a => a.type === 'cardiovascular');
      expect(cardio?.key).toBe('cardiovascularSignificant');
    });

    test('cig/jour = 20 déclenche cardio major', () => {
      const smokingData = { status: 'current', cigarettesPerDay: 20, packYears: 10 };
      const alerts = generateHealthAlerts(smokingData, 40);
      const cardio = alerts.find(a => a.type === 'cardiovascular');
      expect(cardio?.key).toBe('cardiovascularMajor');
    });

    test('cig/jour = 10 ne déclenche pas dépendance', () => {
      const smokingData = { status: 'current', cigarettesPerDay: 10, packYears: 5 };
      const alerts = generateHealthAlerts(smokingData, 40);
      expect(alerts.filter(a => a.type === 'dependence')).toHaveLength(0);
    });

    test('cig/jour = 11 déclenche dépendance probable', () => {
      const smokingData = { status: 'current', cigarettesPerDay: 11, packYears: 5 };
      const alerts = generateHealthAlerts(smokingData, 40);
      const dep = alerts.find(a => a.type === 'dependence');
      expect(dep?.key).toBe('nicotineDependenceProbable');
    });

    test('cig/jour = 20 déclenche dépendance probable (pas forte)', () => {
      const smokingData = { status: 'current', cigarettesPerDay: 20, packYears: 10 };
      const alerts = generateHealthAlerts(smokingData, 40);
      const dep = alerts.find(a => a.type === 'dependence');
      expect(dep?.key).toBe('nicotineDependenceProbable');
    });

    test('cig/jour = 21 déclenche dépendance forte', () => {
      const smokingData = { status: 'current', cigarettesPerDay: 21, packYears: 10 };
      const alerts = generateHealthAlerts(smokingData, 40);
      const dep = alerts.find(a => a.type === 'dependence');
      expect(dep?.key).toBe('nicotineDependenceStrong');
    });
  });
});
