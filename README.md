# 🏥 MedicalPro - Plateforme de Gestion Médicale

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Private-red.svg)]()

> **MedicalPro** est une plateforme SaaS complète de gestion de cabinet médical, développée avec React et conçue pour répondre aux besoins des professionnels de santé modernes.

## 🎯 Vue d'ensemble

MedicalPro offre une solution complète pour la gestion des cabinets médicaux, incluant la gestion des patients, les rendez-vous, les dossiers médicaux, la facturation, et la conformité RGPD.

### ✨ Fonctionnalités principales

- **👥 Gestion des patients** - Dossiers complets, historique médical, documents
- **📅 Rendez-vous** - Planification intelligente, rappels automatiques, gestion des créneaux
- **📋 Dossiers médicaux** - Consultations, diagnostics, prescriptions, suivi
- **🛡️ Consentements RGPD** - Gestion complète des consentements avec templates personnalisables
- **💰 Facturation** - Devis, factures, suivi des paiements
- **📊 Analytics** - Statistiques détaillées et rapports d'activité
- **👤 Gestion des utilisateurs** - Rôles et permissions granulaires
- **🔒 Sécurité** - Conformité RGPD, audit trail, sessions sécurisées

## 🚀 Installation et démarrage

### Prérequis

- Node.js 18+
- npm ou yarn
- Navigateur moderne (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Cloner le projet
git clone [URL_DU_REPO]
cd medical-pro

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start
```

L'application sera accessible sur `http://localhost:3000`

### Scripts disponibles

```bash
npm start          # Démarre le serveur de développement
npm run build      # Crée une version optimisée pour la production
npm test           # Lance les tests
npm run lint       # Vérifie la qualité du code
```

## 🏗️ Architecture

### Structure du projet

```
src/
├── components/           # Composants React réutilisables
│   ├── admin/           # Modules d'administration
│   ├── auth/            # Authentification et permissions
│   ├── dashboard/       # Interface principale
│   ├── medical/         # Composants médicaux spécialisés
│   ├── modals/          # Modales et dialogues
│   └── notifications/   # Système de notifications
├── contexts/            # Contextes React (Auth, Language, etc.)
├── utils/               # Utilitaires et services
├── config/              # Configuration de l'application
└── styles/              # Styles globaux et thèmes
```

### Technologies utilisées

- **Frontend**: React 18, JavaScript ES6+
- **Styling**: Tailwind CSS, Lucide React Icons
- **State Management**: React Context API
- **Storage**: LocalStorage (avec migration backend prévue)
- **Build**: Create React App
- **Linting**: ESLint

## 👥 Système de rôles et permissions

### Rôles disponibles

| Rôle | Niveau | Description |
|------|--------|-------------|
| **Super Admin** | 100 | Accès complet à toutes les fonctionnalités |
| **Admin** | 90 | Gestion complète de la clinique |
| **Médecin** | 70 | Consultations, diagnostics, prescriptions |
| **Spécialiste** | 70 | Accès spécialisé par domaine médical |
| **Infirmier(ère)** | 50 | Soins infirmiers et suivi patients |
| **Secrétaire** | 30 | Gestion administrative et accueil |
| **Lecture seule** | 10 | Consultation uniquement |

### Permissions par module

- **Patients**: Voir, créer, modifier, supprimer, exporter
- **Rendez-vous**: Planifier, modifier, annuler, voir tous
- **Dossiers médicaux**: Créer, consulter, modifier, prescrire
- **Consentements**: Gérer, créer templates, révoquer
- **Facturation**: Devis, factures, paiements
- **Administration**: Utilisateurs, rôles, paramètres système

## 🔐 Sécurité et conformité

### RGPD

- ✅ Gestion complète des consentements
- ✅ Droit à l'oubli et suppression de données
- ✅ Audit trail pour toutes les actions
- ✅ Chiffrement des données sensibles
- ✅ Contrôle d'accès granulaire

### Sécurité

- 🔒 Authentification sécurisée
- 🔒 Sessions avec expiration automatique
- 🔒 Validation côté client et serveur
- 🔒 Protection contre les injections
- 🔒 Logs d'audit complets

## 📱 Interface utilisateur

### Design System

- **Design**: Interface moderne et intuitive
- **Responsive**: Optimisé pour desktop, tablette et mobile
- **Accessibilité**: Conforme aux standards WCAG
- **Thème**: Couleurs médicales professionnelles
- **Icons**: Lucide React pour une cohérence visuelle

### Modules principaux

1. **Dashboard** - Vue d'ensemble et accès rapide
2. **Patients** - Gestion complète des dossiers patients
3. **Rendez-vous** - Calendrier et planification
4. **Dossiers médicaux** - Consultations et suivi médical
5. **Consentements** - Conformité RGPD et templates
6. **Facturation** - Devis, factures et paiements
7. **Analytics** - Statistiques et rapports
8. **Administration** - Gestion utilisateurs et paramètres

## 🔄 Développement

### État actuel

**Epic 1-4 ✅ Complétés**
- ✅ Gestion des patients
- ✅ Données médicales
- ✅ Rendez-vous et suivi
- ✅ Consentements RGPD

**Epic 5 🚧 En cours**
- ✅ Système de rôles et permissions
- ✅ Authentification améliorée
- 🚧 Interface d'administration des utilisateurs
- ⏳ Gestion des équipes et délégations

**Epic 6 ⏳ Planifié**
- ⏳ Sécurité avancée
- ⏳ Audit et conformité
- ⏳ Backup et restauration

### Prochaines étapes

1. Finalisation de l'Epic 5 (Droits & accès)
2. Implémentation de l'Epic 6 (Sécurité & conformité)
3. Migration vers un backend Node.js/PostgreSQL
4. Tests automatisés et CI/CD
5. Déploiement en production

## 🧪 Tests et démonstration

### Comptes de démonstration

```javascript
// Profils de test disponibles dans l'interface
super_admin     // Accès complet
admin          // Gestion clinique
doctor         // Consultations médicales
specialist     // Spécialités médicales
nurse          // Soins infirmiers
secretary      // Administration
readonly       // Consultation seule
```

### Données de test

L'application inclut des données de démonstration pour :
- Patients fictifs avec historiques complets
- Rendez-vous et consultations
- Templates de consentements
- Factures et devis d'exemple

## 📚 Documentation

- [Guide de démarrage rapide](./QUICK_TEST_GUIDE.md)
- [Procédures de test](./TESTING_PROCEDURE.md)
- [Fonctionnalités complétées](./COMPLETED_FEATURES.md)
- [Épics et User Stories](./CliniqueManager_EPICS_US.md)
- [Backlog complet](./us_complete_backlog.md)

## 🤝 Contribution

### Standards de développement

- **Code Style**: ESLint + Prettier
- **Commits**: Messages descriptifs en français
- **Branches**: Feature branches avec noms explicites
- **Tests**: Tests unitaires pour les composants critiques
- **Documentation**: Commentaires JSDoc pour les fonctions complexes

### Guidelines

1. Suivre les conventions de nommage existantes
2. Maintenir la compatibilité avec les permissions
3. Assurer la responsivité mobile
4. Respecter les standards d'accessibilité
5. Valider la conformité RGPD

## 📄 Licence

Ce projet est sous licence propriétaire. Tous droits réservés.

## 📞 Support

Pour toute question ou support technique, contactez l'équipe de développement.

---

**Version actuelle**: v2.0.0
**Dernière mise à jour**: Septembre 2025
**Status**: En développement actif

*MedicalPro - Votre partenaire pour la digitalisation médicale* 🏥✨