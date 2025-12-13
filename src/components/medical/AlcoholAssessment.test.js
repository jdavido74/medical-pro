// AlcoholAssessment.test.js
// Tests unitaires pour les seuils d'évaluation de la consommation d'alcool

import {
  calculateAuditCScore,
  estimateDrinksPerWeek,
  getRiskLevel,
  generateHealthAlerts
} from './AlcoholAssessment';

describe('AlcoholAssessment - Calculs et seuils', () => {

  // ============================================
  // Tests pour calculateAuditCScore
  // ============================================
  describe('calculateAuditCScore', () => {

    test('retourne 0 si auditC est null ou undefined', () => {
      expect(calculateAuditCScore(null)).toBe(0);
      expect(calculateAuditCScore(undefined)).toBe(0);
    });

    test('retourne 0 si toutes les valeurs sont 0', () => {
      expect(calculateAuditCScore({ frequency: 0, quantity: 0, binge: 0 })).toBe(0);
    });

    test('calcule correctement la somme des scores', () => {
      expect(calculateAuditCScore({ frequency: 1, quantity: 1, binge: 1 })).toBe(3);
      expect(calculateAuditCScore({ frequency: 2, quantity: 2, binge: 2 })).toBe(6);
      expect(calculateAuditCScore({ frequency: 4, quantity: 4, binge: 4 })).toBe(12);
    });

    test('score maximum = 12', () => {
      expect(calculateAuditCScore({ frequency: 4, quantity: 4, binge: 4 })).toBe(12);
    });

    test('gère les valeurs manquantes', () => {
      expect(calculateAuditCScore({ frequency: 2 })).toBe(2);
      expect(calculateAuditCScore({ quantity: 3 })).toBe(3);
      expect(calculateAuditCScore({ binge: 1 })).toBe(1);
    });

    test('combinaisons diverses', () => {
      expect(calculateAuditCScore({ frequency: 3, quantity: 2, binge: 1 })).toBe(6);
      expect(calculateAuditCScore({ frequency: 4, quantity: 3, binge: 2 })).toBe(9);
      expect(calculateAuditCScore({ frequency: 1, quantity: 0, binge: 0 })).toBe(1);
    });
  });

  // ============================================
  // Tests pour estimateDrinksPerWeek
  // ============================================
  describe('estimateDrinksPerWeek', () => {

    test('retourne 0 si auditC est null ou undefined', () => {
      expect(estimateDrinksPerWeek(null)).toBe(0);
      expect(estimateDrinksPerWeek(undefined)).toBe(0);
    });

    test('retourne 0 si frequency est 0 (jamais)', () => {
      expect(estimateDrinksPerWeek({ frequency: 0, quantity: 2, binge: 0 })).toBe(0);
    });

    test('estimation pour consommation mensuelle légère', () => {
      // 1x/mois (~0.25/semaine) * 1-2 verres (1.5 avg) = ~0.4
      const result = estimateDrinksPerWeek({ frequency: 1, quantity: 0, binge: 0 });
      expect(result).toBeCloseTo(0.4, 0);
    });

    test('estimation pour consommation hebdomadaire modérée', () => {
      // 2-3x/semaine (2.5) * 3-4 verres (3.5 avg) = ~8.75
      const result = estimateDrinksPerWeek({ frequency: 3, quantity: 1, binge: 0 });
      expect(result).toBeCloseTo(8.8, 0);
    });

    test('estimation pour consommation quotidienne élevée', () => {
      // 4+/semaine (5) * 5-6 verres (5.5 avg) = ~27.5
      const result = estimateDrinksPerWeek({ frequency: 4, quantity: 2, binge: 0 });
      expect(result).toBeCloseTo(27.5, 0);
    });

    test('estimation pour gros buveur', () => {
      // 4+/semaine (5) * 10+ verres (12 avg) = 60
      const result = estimateDrinksPerWeek({ frequency: 4, quantity: 4, binge: 4 });
      expect(result).toBe(60);
    });
  });

  // ============================================
  // Tests pour getRiskLevel - HOMMES
  // ============================================
  describe('getRiskLevel - Hommes (isFemale=false)', () => {

    // Seuil "low" : 0-3
    describe('niveau "low" (score 0-3)', () => {
      test('score 0 -> low', () => {
        expect(getRiskLevel(0, false)).toBe('low');
      });

      test('score 1 -> low', () => {
        expect(getRiskLevel(1, false)).toBe('low');
      });

      test('score 3 -> low (seuil haut)', () => {
        expect(getRiskLevel(3, false)).toBe('low');
      });
    });

    // Seuil "moderate" : 4-5
    describe('niveau "moderate" (score 4-5)', () => {
      test('score 4 -> moderate (seuil bas)', () => {
        expect(getRiskLevel(4, false)).toBe('moderate');
      });

      test('score 5 -> moderate (seuil haut)', () => {
        expect(getRiskLevel(5, false)).toBe('moderate');
      });
    });

    // Seuil "high" : 6-7
    describe('niveau "high" (score 6-7)', () => {
      test('score 6 -> high (seuil bas)', () => {
        expect(getRiskLevel(6, false)).toBe('high');
      });

      test('score 7 -> high (seuil haut)', () => {
        expect(getRiskLevel(7, false)).toBe('high');
      });
    });

    // Seuil "very_high" : >= 8
    describe('niveau "very_high" (score >= 8)', () => {
      test('score 8 -> very_high (seuil)', () => {
        expect(getRiskLevel(8, false)).toBe('very_high');
      });

      test('score 10 -> very_high', () => {
        expect(getRiskLevel(10, false)).toBe('very_high');
      });

      test('score 12 -> very_high (max)', () => {
        expect(getRiskLevel(12, false)).toBe('very_high');
      });
    });
  });

  // ============================================
  // Tests pour getRiskLevel - FEMMES
  // ============================================
  describe('getRiskLevel - Femmes (isFemale=true)', () => {

    // Seuil "low" : 0-2
    describe('niveau "low" (score 0-2)', () => {
      test('score 0 -> low', () => {
        expect(getRiskLevel(0, true)).toBe('low');
      });

      test('score 2 -> low (seuil haut)', () => {
        expect(getRiskLevel(2, true)).toBe('low');
      });
    });

    // Seuil "moderate" : 3-4
    describe('niveau "moderate" (score 3-4)', () => {
      test('score 3 -> moderate (seuil bas)', () => {
        expect(getRiskLevel(3, true)).toBe('moderate');
      });

      test('score 4 -> moderate (seuil haut)', () => {
        expect(getRiskLevel(4, true)).toBe('moderate');
      });
    });

    // Seuil "high" : 5-6
    describe('niveau "high" (score 5-6)', () => {
      test('score 5 -> high (seuil bas)', () => {
        expect(getRiskLevel(5, true)).toBe('high');
      });

      test('score 6 -> high (seuil haut)', () => {
        expect(getRiskLevel(6, true)).toBe('high');
      });
    });

    // Seuil "very_high" : >= 7
    describe('niveau "very_high" (score >= 7)', () => {
      test('score 7 -> very_high (seuil)', () => {
        expect(getRiskLevel(7, true)).toBe('very_high');
      });

      test('score 10 -> very_high', () => {
        expect(getRiskLevel(10, true)).toBe('very_high');
      });

      test('score 12 -> very_high (max)', () => {
        expect(getRiskLevel(12, true)).toBe('very_high');
      });
    });
  });

  // ============================================
  // Tests pour generateHealthAlerts
  // ============================================
  describe('generateHealthAlerts', () => {

    // Test: Non-buveur - aucune alerte
    describe('non-buveur (status: "never")', () => {
      test('ne génère aucune alerte pour un non-buveur', () => {
        const alcoholData = {
          status: 'never',
          drinksPerWeek: 0,
          auditCScore: 0,
          auditC: { frequency: 0, quantity: 0, binge: 0 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        expect(alerts).toHaveLength(0);
      });
    });

    // Tests: Alertes hépatiques
    describe('alertes hépatiques', () => {
      test('pas d\'alerte hépatique si < 14 verres/semaine', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 13,
          auditCScore: 5,
          auditC: { frequency: 3, quantity: 1, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const hepaticAlerts = alerts.filter(a => a.type === 'hepatic');
        expect(hepaticAlerts).toHaveLength(0);
      });

      test('alerte "hepaticRisk" si 14-20 verres/semaine', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 14,
          auditCScore: 6,
          auditC: { frequency: 3, quantity: 2, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const hepaticAlerts = alerts.filter(a => a.type === 'hepatic');
        expect(hepaticAlerts).toHaveLength(1);
        expect(hepaticAlerts[0].key).toBe('hepaticRisk');
        expect(hepaticAlerts[0].severity).toBe('moderate');
      });

      test('alerte "hepaticMonitoring" si >= 21 verres/semaine', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 21,
          auditCScore: 8,
          auditC: { frequency: 4, quantity: 2, binge: 2 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const hepaticAlerts = alerts.filter(a => a.type === 'hepatic');
        expect(hepaticAlerts).toHaveLength(1);
        expect(hepaticAlerts[0].key).toBe('hepaticMonitoring');
        expect(hepaticAlerts[0].severity).toBe('high');
      });
    });

    // Tests: Alertes cardiovasculaires
    describe('alertes cardiovasculaires', () => {
      test('pas d\'alerte cardiovasculaire si < 14 verres/semaine', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 13,
          auditCScore: 5,
          auditC: { frequency: 3, quantity: 1, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const cardioAlerts = alerts.filter(a => a.type === 'cardiovascular');
        expect(cardioAlerts).toHaveLength(0);
      });

      test('alerte cardiovasculaire si >= 14 verres/semaine', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 14,
          auditCScore: 6,
          auditC: { frequency: 3, quantity: 2, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const cardioAlerts = alerts.filter(a => a.type === 'cardiovascular');
        expect(cardioAlerts).toHaveLength(1);
        expect(cardioAlerts[0].key).toBe('cardiovascularRisk');
      });
    });

    // Tests: Alertes dépendance - HOMMES
    describe('alertes dépendance - Hommes', () => {
      test('pas d\'alerte dépendance si AUDIT-C < 6 (homme)', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 10,
          auditCScore: 5,
          auditC: { frequency: 2, quantity: 2, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const depAlerts = alerts.filter(a => a.type === 'dependence');
        expect(depAlerts).toHaveLength(0);
      });

      test('alerte "dependenceRisk" si AUDIT-C 6-7 (homme)', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 12,
          auditCScore: 6,
          auditC: { frequency: 2, quantity: 2, binge: 2 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const depAlerts = alerts.filter(a => a.type === 'dependence');
        expect(depAlerts).toHaveLength(1);
        expect(depAlerts[0].key).toBe('dependenceRisk');
        expect(depAlerts[0].severity).toBe('moderate');
      });

      test('alerte "dependenceHigh" si AUDIT-C >= 8 (homme)', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 20,
          auditCScore: 8,
          auditC: { frequency: 3, quantity: 3, binge: 2 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const depAlerts = alerts.filter(a => a.type === 'dependence');
        expect(depAlerts).toHaveLength(1);
        expect(depAlerts[0].key).toBe('dependenceHigh');
        expect(depAlerts[0].severity).toBe('high');
      });
    });

    // Tests: Alertes dépendance - FEMMES
    describe('alertes dépendance - Femmes', () => {
      test('pas d\'alerte dépendance si AUDIT-C < 5 (femme)', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 8,
          auditCScore: 4,
          auditC: { frequency: 2, quantity: 1, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, true);
        const depAlerts = alerts.filter(a => a.type === 'dependence');
        expect(depAlerts).toHaveLength(0);
      });

      test('alerte "dependenceRisk" si AUDIT-C 5-6 (femme)', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 10,
          auditCScore: 5,
          auditC: { frequency: 2, quantity: 2, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, true);
        const depAlerts = alerts.filter(a => a.type === 'dependence');
        expect(depAlerts).toHaveLength(1);
        expect(depAlerts[0].key).toBe('dependenceRisk');
      });

      test('alerte "dependenceHigh" si AUDIT-C >= 7 (femme)', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 15,
          auditCScore: 7,
          auditC: { frequency: 3, quantity: 2, binge: 2 }
        };
        const alerts = generateHealthAlerts(alcoholData, true);
        const depAlerts = alerts.filter(a => a.type === 'dependence');
        expect(depAlerts).toHaveLength(1);
        expect(depAlerts[0].key).toBe('dependenceHigh');
      });
    });

    // Tests: Alertes binge drinking
    describe('alertes binge drinking', () => {
      test('pas d\'alerte binge si binge < 2', () => {
        const alcoholData = {
          status: 'occasional',
          drinksPerWeek: 5,
          auditCScore: 3,
          auditC: { frequency: 2, quantity: 0, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const bingeAlerts = alerts.filter(a => a.type === 'binge');
        expect(bingeAlerts).toHaveLength(0);
      });

      test('alerte binge modérée si binge = 2 (mensuel)', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 10,
          auditCScore: 5,
          auditC: { frequency: 2, quantity: 1, binge: 2 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const bingeAlerts = alerts.filter(a => a.type === 'binge');
        expect(bingeAlerts).toHaveLength(1);
        expect(bingeAlerts[0].key).toBe('bingeWarning');
        expect(bingeAlerts[0].severity).toBe('moderate');
      });

      test('alerte binge haute si binge >= 3 (hebdomadaire+)', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 15,
          auditCScore: 7,
          auditC: { frequency: 3, quantity: 1, binge: 3 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const bingeAlerts = alerts.filter(a => a.type === 'binge');
        expect(bingeAlerts).toHaveLength(1);
        expect(bingeAlerts[0].severity).toBe('high');
      });
    });

    // Tests: Alertes interaction médicamenteuse
    describe('alertes interaction médicamenteuse', () => {
      test('alerte interaction pour consommateur régulier', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 8,
          auditCScore: 4,
          auditC: { frequency: 2, quantity: 1, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const interactionAlerts = alerts.filter(a => a.type === 'interaction');
        expect(interactionAlerts).toHaveLength(1);
        expect(interactionAlerts[0].key).toBe('interactionWarning');
        expect(interactionAlerts[0].severity).toBe('info');
      });

      test('alerte interaction si >= 10 verres/semaine', () => {
        const alcoholData = {
          status: 'occasional',
          drinksPerWeek: 10,
          auditCScore: 4,
          auditC: { frequency: 2, quantity: 1, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const interactionAlerts = alerts.filter(a => a.type === 'interaction');
        expect(interactionAlerts).toHaveLength(1);
      });

      test('pas d\'alerte interaction pour consommateur occasionnel léger', () => {
        const alcoholData = {
          status: 'occasional',
          drinksPerWeek: 5,
          auditCScore: 2,
          auditC: { frequency: 1, quantity: 0, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        const interactionAlerts = alerts.filter(a => a.type === 'interaction');
        expect(interactionAlerts).toHaveLength(0);
      });
    });

    // Tests: Combinaisons d'alertes
    describe('combinaisons d\'alertes', () => {
      test('gros buveur génère toutes les alertes appropriées', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 30,
          auditCScore: 10,
          auditC: { frequency: 4, quantity: 3, binge: 3 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);

        const types = alerts.map(a => a.type);
        expect(types).toContain('hepatic');
        expect(types).toContain('cardiovascular');
        expect(types).toContain('dependence');
        expect(types).toContain('binge');
        expect(types).toContain('interaction');
      });

      test('buveur modéré génère alertes appropriées', () => {
        const alcoholData = {
          status: 'regular',
          drinksPerWeek: 12,
          auditCScore: 5,
          auditC: { frequency: 3, quantity: 1, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);

        const types = alerts.map(a => a.type);
        expect(types).toContain('interaction'); // regular drinker
        expect(types).not.toContain('hepatic'); // < 14/week
        expect(types).not.toContain('dependence'); // score < 6 for men
      });

      test('ancien buveur avec faibles données', () => {
        const alcoholData = {
          status: 'former',
          drinksPerWeek: 0,
          auditCScore: 1,
          auditC: { frequency: 0, quantity: 0, binge: 1 }
        };
        const alerts = generateHealthAlerts(alcoholData, false);
        expect(alerts).toHaveLength(0);
      });
    });
  });

  // ============================================
  // Tests de validation des valeurs limites
  // ============================================
  describe('valeurs limites (boundary testing)', () => {

    // Homme - seuils AUDIT-C
    test('homme: score 3 -> low', () => {
      expect(getRiskLevel(3, false)).toBe('low');
    });

    test('homme: score 4 -> moderate', () => {
      expect(getRiskLevel(4, false)).toBe('moderate');
    });

    test('homme: score 5 -> moderate', () => {
      expect(getRiskLevel(5, false)).toBe('moderate');
    });

    test('homme: score 6 -> high', () => {
      expect(getRiskLevel(6, false)).toBe('high');
    });

    test('homme: score 7 -> high', () => {
      expect(getRiskLevel(7, false)).toBe('high');
    });

    test('homme: score 8 -> very_high', () => {
      expect(getRiskLevel(8, false)).toBe('very_high');
    });

    // Femme - seuils AUDIT-C
    test('femme: score 2 -> low', () => {
      expect(getRiskLevel(2, true)).toBe('low');
    });

    test('femme: score 3 -> moderate', () => {
      expect(getRiskLevel(3, true)).toBe('moderate');
    });

    test('femme: score 4 -> moderate', () => {
      expect(getRiskLevel(4, true)).toBe('moderate');
    });

    test('femme: score 5 -> high', () => {
      expect(getRiskLevel(5, true)).toBe('high');
    });

    test('femme: score 6 -> high', () => {
      expect(getRiskLevel(6, true)).toBe('high');
    });

    test('femme: score 7 -> very_high', () => {
      expect(getRiskLevel(7, true)).toBe('very_high');
    });

    // Seuils verres/semaine
    test('13 verres/semaine ne déclenche pas alerte hépatique', () => {
      const alcoholData = { status: 'regular', drinksPerWeek: 13, auditCScore: 5, auditC: {} };
      const alerts = generateHealthAlerts(alcoholData, false);
      expect(alerts.filter(a => a.type === 'hepatic')).toHaveLength(0);
    });

    test('14 verres/semaine déclenche alerte hépatique', () => {
      const alcoholData = { status: 'regular', drinksPerWeek: 14, auditCScore: 5, auditC: {} };
      const alerts = generateHealthAlerts(alcoholData, false);
      expect(alerts.filter(a => a.type === 'hepatic')).toHaveLength(1);
    });

    test('20 verres/semaine déclenche hepaticRisk', () => {
      const alcoholData = { status: 'regular', drinksPerWeek: 20, auditCScore: 6, auditC: {} };
      const alerts = generateHealthAlerts(alcoholData, false);
      const hepatic = alerts.find(a => a.type === 'hepatic');
      expect(hepatic?.key).toBe('hepaticRisk');
    });

    test('21 verres/semaine déclenche hepaticMonitoring', () => {
      const alcoholData = { status: 'regular', drinksPerWeek: 21, auditCScore: 7, auditC: {} };
      const alerts = generateHealthAlerts(alcoholData, false);
      const hepatic = alerts.find(a => a.type === 'hepatic');
      expect(hepatic?.key).toBe('hepaticMonitoring');
    });
  });

  // ============================================
  // Tests différences homme/femme
  // ============================================
  describe('différences de seuils homme/femme', () => {

    test('même score, risque différent selon genre', () => {
      // Score 3: low pour homme, moderate pour femme
      expect(getRiskLevel(3, false)).toBe('low');
      expect(getRiskLevel(3, true)).toBe('moderate');

      // Score 5: moderate pour homme, high pour femme
      expect(getRiskLevel(5, false)).toBe('moderate');
      expect(getRiskLevel(5, true)).toBe('high');

      // Score 7: high pour homme, very_high pour femme
      expect(getRiskLevel(7, false)).toBe('high');
      expect(getRiskLevel(7, true)).toBe('very_high');
    });

    test('seuil dépendance différent selon genre', () => {
      // Score 6: déclenche dépendance pour homme, déjà déclenché pour femme à 5
      const alcoholDataScore5 = {
        status: 'regular',
        drinksPerWeek: 10,
        auditCScore: 5,
        auditC: {}
      };

      const alertsMan5 = generateHealthAlerts(alcoholDataScore5, false);
      const alertsWoman5 = generateHealthAlerts(alcoholDataScore5, true);

      expect(alertsMan5.filter(a => a.type === 'dependence')).toHaveLength(0);
      expect(alertsWoman5.filter(a => a.type === 'dependence')).toHaveLength(1);
    });
  });
});
