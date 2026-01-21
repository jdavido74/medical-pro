# 🏥 MedicalPro - Plateforme de Gestion Médicale

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Private-red.svg)]()

> **MedicalPro** est une plateforme SaaS complète de gestion de cabinet médical, développée avec React et conçue pour répondre aux besoins des professionnels de santé modernes.

## 🚀 Démarrage rapide

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement
npm start

# Build pour la production
npm run build
```

L'application sera accessible sur `http://localhost:3000`

👉 **Nouveau sur le projet ?** Consultez le [guide de démarrage](./docs/guides/GETTING_STARTED.md)

---

## 📖 Documentation

La documentation est organisée par domaine pour plus de clarté :

### 🎯 **Pour commencer**
- [Guide de démarrage rapide](./docs/guides/GETTING_STARTED.md) - Installation et premiers pas
- [Référence rapide](./docs/guides/QUICK_REFERENCE.md) - Dépannage et conseils
- [Checklist de test](./docs/guides/TESTING_CHECKLIST.md) - Procédures de test
- [Configuration régionale](./docs/guides/REGIONAL_SETUP.md) - Multi-région et sous-domaines

### 🏗️ **Architecture & Design**
- [Architecture globale](./docs/architecture/ARCHITECTURE.md) - Structure du projet et patterns
- [Architecture multi-région](./docs/architecture/MULTIREGION_ARCHITECTURE.md) - Support multi-pays
- [Infrastructure](./docs/architecture/MULTIREGION_INFRASTRUCTURE.md) - Déploiement multi-région
- [Synchronisation des données](./docs/architecture/DATA_SYNC.md) - Stratégie de sync

### ⚙️ **Configuration & Déploiement**
- [Setup backend](./docs/configuration/BACKEND_SETUP.md) - Configuration backend
- [CI/CD automation](./docs/configuration/CI_CD.md) - Pipeline d'intégration continue
- [Quick CI/CD start](./docs/configuration/CI_CD_QUICK_START.md) - Configuration rapide
- [Controller](./docs/configuration/CONTROLLER.md) - Service controller
- [Scripts](./docs/configuration/SCRIPTS.md) - Scripts d'automation
- [Déploiement multi-région](./docs/configuration/DEPLOYMENT_MULTIREGION.md) - Déploiement distribué

### 🔐 **Sécurité**
- [Architecture de sécurité](./docs/security/SECURITY_ARCHITECTURE.md) - Principes de sécurité
- [Analyse de sécurité](./docs/security/SECURITY_ANALYSIS.md) - Évaluation complète
- [Posture de sécurité](./docs/security/SECURITY_POSTURE.md) - Évolution de la sécurité
- [Vérification email](./docs/security/EMAIL_VERIFICATION.md) - Vérification des emails

### 🌍 **Fonctionnalités**
- [Support multilingue](./docs/features/MULTILINGUAL_EMAILS.md) - Support I18N complet
- [Implémentation i18n](./docs/features/I18N_IMPLEMENTATION.md) - Intégration traductions
- [Migration i18n](./docs/features/I18N_MIGRATION.md) - Migration du système
- [Corrections linguistiques](./docs/features/I18N_CORRECTIONS.md) - Corrections appliquées
- [Effort i18n](./docs/features/I18N_EFFORT.md) - Estimation d'effort
- [Scalabilité i18n](./docs/features/I18N_SCALABILITY.md) - Évolution du système

### 📋 **Planification & Roadmap**
- [Roadmap](./docs/planning/ROADMAP.md) - Évolutions futures
- [Intégration backend](./docs/planning/BACKEND_INTEGRATION.md) - Plan d'intégration
- [Épics et User Stories](./docs/planning/EPICS_AND_USER_STORIES.md) - Spécifications détaillées
- [Backlog complet](./docs/planning/BACKLOG.md) - Tous les items du backlog
- [Résumé du projet](./docs/planning/PROJECT_COMPLETION.md) - État d'avancement
- [Résumé d'implémentation](./docs/planning/IMPLEMENTATION.md) - Détails techniques
- [Fonctionnalités complétées](./docs/planning/COMPLETED_FEATURES.md) - Features finalisées
- [Contexte régional](./docs/planning/REGIONAL_CONTEXT.md) - Exigences par région

---

## 🎯 Vue d'ensemble

### ✨ Fonctionnalités principales

- **👥 Gestion des patients** - Dossiers complets, historique médical, documents
- **📅 Rendez-vous** - Planification intelligente, rappels automatiques, gestion des créneaux
- **📋 Dossiers médicaux** - Consultations, diagnostics, prescriptions, suivi
- **🛡️ Consentements RGPD** - Gestion complète des consentements avec templates personnalisables
- **💰 Facturation** - Devis, factures, suivi des paiements
- **📊 Analytics** - Statistiques détaillées et rapports d'activité
- **👤 Gestion des utilisateurs** - Rôles et permissions granulaires
- **🔒 Sécurité** - Conformité RGPD, audit trail, sessions sécurisées
- **🌍 Multi-régions** - Support de plusieurs pays et régions
- **🌐 Multilingue** - Support FR/ES/EN avec emails localisés

### 📁 Structure du projet

```
medical-pro/
├── docs/                    # Documentation structurée
│   ├── guides/             # Guides de démarrage et test
│   ├── architecture/       # Architecture et design
│   ├── configuration/      # Setup et déploiement
│   ├── security/          # Sécurité et conformité
│   ├── features/          # Détails des fonctionnalités
│   └── planning/          # Roadmap et planification
├── src/
│   ├── components/        # Composants React
│   ├── contexts/          # Contextes (Auth, Language, etc.)
│   ├── utils/             # Utilitaires et services
│   ├── config/            # Configuration
│   └── styles/            # Styles CSS
└── public/                # Ressources statiques
```

### 👥 Rôles et permissions

| Rôle | Niveau | Description |
|------|--------|-------------|
| **Super Admin** | 100 | Accès complet + gestion système |
| **Admin** | 90 | Gestion complète de la clinique |
| **Médecin** | 70 | Consultations et diagnostics |
| **Spécialiste** | 70 | Accès spécialisé |
| **Infirmier(ère)** | 50 | Soins et suivi patients |
| **Secrétaire** | 30 | Administration et accueil |
| **Lecture seule** | 10 | Consultation uniquement |

---

## 🧪 Tester l'application

### Profils de test

Utilisez le menu de changement de profil (en haut à gauche) pour tester les différents niveaux d'accès :
- `super_admin` - Accès complet
- `admin` - Gestion clinique
- `doctor` - Consultations
- `specialist` - Spécialités
- `nurse` - Soins infirmiers
- `secretary` - Administration
- `readonly` - Consultation seule

### Données de démonstration

L'application inclut des données fictives pour :
- Patients avec historiques complets
- Rendez-vous et consultations
- Templates de consentements
- Factures et devis d'exemple

---

## 🤝 Contribution

### Standards de code

- **ESLint + Prettier** - Formatage automatique
- **Français** - Messages de commit en français
- **Feature branches** - Noms explicites des branches
- **Tests** - Tests unitaires pour les composants critiques
- **Documentation** - Commentaires JSDoc

### Guidelines

1. Suivre les conventions de nommage existantes
2. Maintenir la compatibilité avec les permissions
3. Assurer la responsivité (mobile, tablette, desktop)
4. Respecter les standards d'accessibilité WCAG
5. Valider la conformité RGPD

---

## 📦 Technologies utilisées

- **Frontend**: React 18, JavaScript ES6+
- **Styling**: Tailwind CSS, Lucide React Icons
- **State**: React Context API
- **Storage**: LocalStorage (migration backend prévue)
- **Build**: Create React App
- **Linting**: ESLint

---

## 📄 Licence

Ce projet est sous licence propriétaire. Tous droits réservés.

---

**Version actuelle**: v2.0.0
**Dernière mise à jour**: Décembre 2025
**Status**: En développement actif

*MedicalPro - Votre partenaire pour la digitalisation médicale* 🏥✨