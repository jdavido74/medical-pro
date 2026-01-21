# Documentation Multi-Pays - MedicalPro

## Vue d'ensemble

Ce projet implémente une architecture multi-pays pour supporter à la fois la **France (FR)** et l'**Espagne (ES)** avec des configurations métier spécifiques à chaque pays.

---

## Documentation Disponible

### 1. [MULTI_COUNTRY_INFRASTRUCTURE.md](./MULTI_COUNTRY_INFRASTRUCTURE.md) - Référence Complète
**Document principal de 18KB contenant:**

- Configuration de pays (ConfigManager, .env)
- Validations par pays (SIRET, NIF, VAT, téléphone)
- Localisation/i18n (structure, configuration, hooks)
- Contraintes métier (TVA, devise, documents, conformité)
- Configuration des cliniques (architecture DB, modèles)
- Schémas de validation (Joi)
- Variables d'environnement
- Migrations base de données
- Intégrations manquantes et recommandations

**À consulter pour:**
- Comprendre l'architecture complète
- Connaître tous les paramètres spécifiques par pays
- Identifier les gaps et les améliorations à faire

---

### 2. [MULTI_COUNTRY_ARCHITECTURE_DIAGRAM.md](./MULTI_COUNTRY_ARCHITECTURE_DIAGRAM.md) - Diagrammes Visuels
**Document de 12KB avec 11 diagrammes ASCII détaillés:**

1. Flux de configuration pays au démarrage
2. Request flow avec routing backend
3. Architecture base de données (isolation clinique)
4. Couches de validation (frontend → backend)
5. Flux de localisation i18n
6. Hiérarchie de configuration
7. Matrice des règles de validation par pays
8. Points d'intégration dans les composants React
9. Flow des endpoints API de validation
10. Cycle complet request-to-response
11. Gestion des erreurs

**À consulter pour:**
- Visualiser les flux de données
- Comprendre le routage des requêtes
- Voir la hiérarchie de configuration
- Intégrer de nouvelles fonctionnalités

---

## Structure Physique du Code

```
medical-pro/
├── src/
│   ├── config/
│   │   ├── ConfigManager.js          # Singleton pour config pays
│   │   └── countries/
│   │       ├── france.js              # Config FR (SIRET, TVA 20%, etc.)
│   │       └── spain.js               # Config ES (NIF, IVA 21%, etc.)
│   │
│   ├── locales/                       # Traductions i18n
│   │   ├── fr/
│   │   ├── en/
│   │   └── es/
│   │
│   ├── utils/
│   │   └── validation.js              # Validations France/Espagne
│   │
│   ├── hooks/
│   │   └── useLanguage.js             # Hook pour langue/traductions
│   │
│   ├── i18n.js                        # Configuration i18next
│   └── .env                           # REACT_APP_COUNTRY=FR|ES
│
medical-pro-backend/
├── src/
│   ├── config/
│   │   └── database.js
│   │
│   ├── services/
│   │   ├── inseeService.js            # Validation SIRET via API INSEE
│   │   └── spainService.js            # Validation NIF
│   │
│   ├── middleware/
│   │   ├── clinicRouting.js           # Route à la bonne clinic DB
│   │   └── auth.js
│   │
│   ├── models/
│   │   └── Company.js                 # Modèle avec pays & validations
│   │
│   ├── routes/
│   │   └── validation.js              # POST /validation/siret|nif|vat
│   │
│   ├── base/
│   │   └── validationSchemas.js       # Schémas Joi pour modèles
│   │
│   ├── migrations/
│   │   ├── central_001_initial_schema.sql    # Central DB
│   │   └── 001_medical_schema.sql            # Clinic DB
│   │
│   └── .env                           # INSEE_API_TOKEN, etc.
```

---

## État d'Implémentation par Fonctionnalité

### Frontend
- ✅ Configuration pays (ConfigManager)
- ✅ Validations pays (SIRET, NIF, téléphone)
- ✅ Localisation complète (i18n FR/EN/ES)
- ⚠️ TVA/Taxation: partiellement
- ❌ Formats documents: non implémentés

### Backend
- ✅ Validation SIRET via API INSEE
- ✅ Validation NIF avec algorithme officiel
- ✅ Routes d'isolation clinique
- ⚠️ Schémas Joi: non contextuées par pays
- ❌ Numéros médicaux: partiellement
- ❌ Conformité réglementaire: non implémentée

### Base de Données
- ✅ Architecture multi-clinic isolée
- ✅ Champ `country` dans Company
- ⚠️ Settings par pays: JSONB générique
- ❌ Pas de configuration des taux TVA en DB
- ❌ Pas d'audit trail des changements

---

## Paramètres Clés par Pays

### FRANCE (FR)

| Paramètre | Valeur |
|-----------|--------|
| Code Pays | FR |
| Devise | EUR (€) |
| Locale | fr-FR |
| TVA par défaut | 20% |
| Taux TVA | 0%, 5.5%, 10%, 20% |
| Label TVA | TVA |
| Numéro entreprise | SIRET (14 chiffres) |
| TVA Number | FR + 11 chiffres |
| VAT Requis | Non |
| Téléphone | +33/0123456789 |
| Code postal | 5 chiffres |
| Praticiens | ADELI (9 chiffres) ou RPPS (11 chiffres) |
| Numéro facture | FA-YYYY-NNNN |
| Archivage | 10 ans |
| Langue par défaut | Français |
| Langues disponibles | FR, EN |

### ESPAÑA (ES)

| Paramètre | Valeur |
|-----------|--------|
| Code Pays | ES |
| Devise | EUR (€) |
| Locale | es-ES |
| TVA par défaut | 21% |
| Taux TVA | 0%, 4%, 10%, 21% |
| Label TVA | IVA |
| Numéro entreprise | NIF (L+7D+C) |
| VAT Number | ES + NIF |
| VAT Requis | Oui |
| Téléphone | +34/6-9 + 8 chiffres |
| Code postal | 5 chiffres |
| Praticiens | Colegiado (6-10 chiffres) |
| Numéro facture | FACT-YYYY-NNNN |
| Archivage | 4 ans |
| Langue par défaut | Español |
| Langues disponibles | ES, EN |

---

## Flux de Déploiement Multi-Pays

### Production - Instance France
```bash
REACT_APP_COUNTRY=FR npm build
# → Frontend avec validation SIRET, TVA 20%, langue FR par défaut
```

### Production - Instance Espagne
```bash
REACT_APP_COUNTRY=ES npm build
# → Frontend avec validation NIF, IVA 21%, langue ES par défaut
```

### Configuration Backend (même pour les deux)
```env
INSEE_API_TOKEN=xxx        # France: Valider SIRET via API
# Espagne: NIF validation locale uniquement
```

---

## Points d'Extension Recommandés

### Ajouter un Nouveau Pays (Portugal)

1. **Créer config:** `/src/config/countries/portugal.js`
   ```javascript
   export const PORTUGAL_CONFIG = {
     country: { code: 'PT', name: 'Portugal', ... },
     taxation: { defaultRate: 23, ... },
     business: { registrationNumber: { field: 'nif', ... } },
     ...
   }
   ```

2. **Ajouter au ConfigManager:**
   ```javascript
   case 'PT':
     const { PORTUGAL_CONFIG } = await import('./countries/portugal.js');
     this.currentConfig = PORTUGAL_CONFIG;
   ```

3. **Ajouter au Company model:**
   ```javascript
   validate: { isIn: [['FR', 'ES', 'PT']] }
   ```

4. **Ajouter service validation:** `spainService.js` → `portugueseService.js`

5. **Ajouter routes i18n:** `/locales/pt/`

6. **Ajouter routes API:** `/validation/portuguese`

7. **Ajouter migrations:** Schémas comme clinic DB

---

## Commandes Utiles

### Démarrer Frontend
```bash
cd /var/www/medical-pro
REACT_APP_COUNTRY=FR npm start    # France
REACT_APP_COUNTRY=ES npm start    # Espagne
```

### Démarrer Backend
```bash
cd /var/www/medical-pro-backend
npm start
```

### Valider une SIRET (France)
```bash
curl -X POST http://localhost:3001/api/v1/validation/siret \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"siret":"82140255300213"}'
```

### Valider un NIF (Espagne)
```bash
curl -X POST http://localhost:3001/api/v1/validation/nif \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"nif":"B12345674"}'
```

---

## FAQ

**Q: Peut-on avoir plusieurs instances avec des pays différents?**
A: Oui, chaque deployment peut avoir son propre `REACT_APP_COUNTRY`. Le backend gère tous les pays via le champ `country` du modèle Company.

**Q: Peut-on changer le pays d'une clinique?**
A: Non (pour l'instant). Il est fixé à la création de la clinique dans la DB.

**Q: Les patients/médecins voient-ils le pays?**
A: Non, le pays est implicite au niveau de la clinique. Les configs utilisateur héritent du pays de leur clinique.

**Q: Comment tester multi-pays localement?**
A: Démarrer deux instances frontend (ports 3000 et 3001) avec des `.env` différents. Tous deux communiquent avec le même backend (port 3001).

**Q: L'API INSEE est-elle obligatoire?**
A: Non. Si le token n'est pas configuré, le système utilise une validation de format uniquement.

---

## Ressources Externes

- **Configuration France:**
  - [INSEE API Sirene](https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=Sirene&version=V3)
  - [Code Général des Impôts](https://www.legifrance.gouv.fr/)

- **Configuration Espagne:**
  - [Ley 37/1992 del IVA](https://www.boe.es/)
  - [NIF/CIF Validation](https://www.agenciatributaria.es/)

---

## Support

Pour questions sur l'implémentation multi-pays:
- Consulter `MULTI_COUNTRY_INFRASTRUCTURE.md` pour détails techniques
- Consulter `MULTI_COUNTRY_ARCHITECTURE_DIAGRAM.md` pour flux visuels
- Vérifier les fichiers sources listés dans la section "Structure Physique"

---

**Dernière mise à jour:** 2025-11-09
**Explorer:** Claude Code
**État:** Documentation Complète
