# DPIA — Analyse d'Impact relative à la Protection des Données

## MEDIMaestro — Plateforme SaaS de Gestion de Cabinet Médical

---

| Champ | Valeur |
|---|---|
| **Responsable de traitement** | [NOM SOCIETE], [ADRESSE], [PAYS] |
| **Représentant légal** | [NOM DU REPRESENTANT LEGAL] |
| **Délégué à la Protection des Données (DPO)** | [NOM DPO / CABINET DPO EXTERNE] — [EMAIL DPO] — [TEL DPO] |
| **Date de création** | 26 février 2026 |
| **Version** | 1.0 |
| **Statut** | Brouillon — en attente de validation DPO |
| **Prochaine révision prévue** | 26 août 2026 (semestrielle, ou sur modification substantielle) |
| **Référence audit** | `COMPLIANCE_AUDIT_2026-02-26.md` |
| **Classification** | Confidentiel |

---

## Table des matières

1. [Contexte et obligation de réaliser un DPIA](#1-contexte-et-obligation-de-réaliser-un-dpia)
2. [Description systématique des traitements](#2-description-systématique-des-traitements)
3. [Inventaire des données personnelles](#3-inventaire-des-données-personnelles)
4. [Base légale de chaque traitement](#4-base-légale-de-chaque-traitement)
5. [Flux de données](#5-flux-de-données)
6. [Nécessité et proportionnalité](#6-nécessité-et-proportionnalité)
7. [Évaluation des risques pour les droits et libertés](#7-évaluation-des-risques-pour-les-droits-et-libertés)
8. [Mesures de sécurité existantes](#8-mesures-de-sécurité-existantes)
9. [Risques résiduels et plan de remédiation](#9-risques-résiduels-et-plan-de-remédiation)
10. [Droits des personnes concernées](#10-droits-des-personnes-concernées)
11. [Transferts de données](#11-transferts-de-données)
12. [Avis du DPO et validation](#12-avis-du-dpo-et-validation)
13. [Historique des révisions](#13-historique-des-révisions)

---

## 1. Contexte et obligation de réaliser un DPIA

### 1.1 Description du produit

**MEDIMaestro** est une plateforme SaaS (Software as a Service) de gestion de cabinet médical destinée aux professionnels de santé. Elle permet :

- La gestion des dossiers patients (identité, antécédents, dossiers médicaux)
- La prise de rendez-vous et la gestion de l'agenda
- La rédaction d'ordonnances et de comptes rendus médicaux
- La gestion des consentements éclairés (signature électronique)
- La facturation et le suivi administratif
- L'audit et la traçabilité des accès aux données de santé

### 1.2 Double rôle au regard du RGPD

MEDIMaestro intervient sous deux qualités distinctes :

| Rôle RGPD | Périmètre | Base |
|---|---|---|
| **Sous-traitant** (Art. 28 RGPD) | Données de santé des patients, traitées pour le compte des cliniques clientes (responsables de traitement) | Contrat de sous-traitance (DPA) avec chaque clinique |
| **Responsable de traitement** (Art. 4(7) RGPD) | Données des comptes utilisateurs (professionnels de santé), données de facturation, données techniques (logs, audit) | Exécution contractuelle + intérêt légitime |

### 1.3 Critères déclencheurs du DPIA (Art. 35 RGPD)

La réalisation de ce DPIA est **obligatoire** au regard des critères suivants :

| Critère (Lignes directrices WP248 rev.01) | Applicabilité |
|---|---|
| **Données de catégorie spéciale** (Art. 9) | **OUI** — données de santé (dossiers médicaux, ordonnances, antécédents, allergies, constantes vitales) |
| **Traitement à grande échelle** | **OUI** — plateforme multi-tenant destinée à plusieurs cliniques, nombre de patients potentiellement élevé |
| **Personnes vulnérables** | **OUI** — patients (relation de dépendance avec le professionnel de santé) |
| **Évaluation/scoring systématique** | **OUI** — suivi longitudinal de l'état de santé, historique des consultations |
| **Données relatives aux enfants/mineurs** | **OUI** — patients mineurs possibles (représentant légal prévu dans le modèle) |
| **Utilisation de nouvelles technologies** | **OUI** — SaaS cloud, multi-tenancy, API REST |

**Conclusion** : Au moins 3 critères WP248 sont remplis → le DPIA est obligatoire.

### 1.4 Cadre réglementaire applicable

- **RGPD** (Règlement UE 2016/679) — applicable directement
- **LOPDGDD** (Loi Organique 3/2018, Espagne) — loi nationale de transposition
- **Autorité de contrôle** : AEPD (Agencia Española de Protección de Datos)
- **Art. 37 RGPD** : Désignation d'un DPO obligatoire (traitement de données de santé à grande échelle comme activité principale)

---

## 2. Description systématique des traitements

### 2.1 Finalités des traitements

| # | Finalité | Description | Catégories de personnes |
|---|---|---|---|
| F1 | **Gestion des dossiers médicaux** | Création, consultation et modification des dossiers patients, antécédents, constantes vitales, diagnostics | Patients |
| F2 | **Prescription médicale** | Rédaction, finalisation et impression d'ordonnances avec snapshot patient/praticien | Patients, Praticiens |
| F3 | **Gestion des rendez-vous** | Planification, confirmation, suivi des consultations | Patients, Praticiens |
| F4 | **Consentement éclairé** | Recueil, stockage et gestion du cycle de vie des consentements (14 types) | Patients, Témoins |
| F5 | **Facturation** | Émission de factures, devis, avoirs avec données patient et praticien | Patients, Praticiens |
| F6 | **Gestion des utilisateurs** | Création et gestion des comptes professionnels de santé, attribution de rôles et permissions | Professionnels de santé |
| F7 | **Audit et traçabilité** | Journalisation de tous les accès et modifications aux données sensibles (35 types d'événements) | Tous les utilisateurs |
| F8 | **Sécurité** | Authentification, contrôle d'accès (RBAC), détection de tentatives non autorisées | Tous les utilisateurs |
| F9 | **Administration de la plateforme** | Gestion des cliniques clientes, provisionnement des bases de données | Administrateurs, Cliniques |

### 2.2 Moyens de traitement

| Composant | Technologie | Localisation |
|---|---|---|
| **Frontend** | React SPA (Single Page Application) | Navigateur du client |
| **Backend / API** | Node.js, Express.js, API REST | VPS Hostinger, [PAYS DATACENTER] |
| **Base de données** | PostgreSQL (architecture multi-tenant : 1 BD centrale + 1 BD par clinique) | Même VPS |
| **Hébergement** | VPS Hostinger (IP : 72.62.51.173) | [CONFIRMER : UE/EEE] |
| **Certificats TLS** | Let's Encrypt (renouvellement automatique) | — |
| **Email transactionnel** | [FOURNISSEUR SMTP] | [PAYS FOURNISSEUR] |
| **Sauvegardes** | Chiffrées GPG (AES-256), rotation quotidienne, rétention 30 jours | VPS + [SERVEUR BACKUP HORS SITE — à configurer] |
| **Proxy inverse** | Nginx (TLS termination, rate limiting, headers sécurité) | Même VPS |

### 2.3 Architecture multi-tenant

```
┌──────────────────────────────────────────────────┐
│                   Nginx (TLS)                     │
│          Rate limiting + Security headers          │
└──────────────────┬───────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │   Node.js / Express│
         │   API REST (JWT)   │
         └─────────┬─────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌────────┐  ┌───────────┐  ┌───────────┐
│Central │  │ Clinic DB │  │ Clinic DB │
│  DB    │  │  (UUID_1) │  │  (UUID_2) │
│(users, │  │(patients, │  │(patients, │
│company)│  │ medical,  │  │ medical,  │
│        │  │ consents) │  │ consents) │
└────────┘  └───────────┘  └───────────┘
```

**Isolation** : Chaque clinique dispose de sa propre base de données PostgreSQL (`medicalpro_clinic_<UUID>`). La base centrale (`medicalpro_central`) contient uniquement les comptes utilisateurs et les informations de société. L'accès inter-cliniques est impossible par conception.

---

## 3. Inventaire des données personnelles

### 3.1 Classification par niveau de sensibilité

#### Niveau CRITIQUE — Données de santé (Art. 9 RGPD)

| Modèle | Données | Détail |
|---|---|---|
| **MedicalRecord** | Motif de consultation, maladie actuelle, symptômes, constantes vitales, antécédents, allergies, diagnostics (codes CIM-10), pathologies chroniques, examen physique, traitements, plan de traitement, médicaments, avertissements médicamenteux, groupe sanguin, notes d'évolution, notes privées | JSONB — texte libre + données structurées |
| **Prescription** | Médicaments (nom, dosage, fréquence, voie, durée, quantité), instructions, diagnostics, constantes vitales, antécédents, maladie actuelle, examen physique, médicaments en cours | JSONB + TEXT |
| **Patient** | Groupe sanguin, allergies, pathologies chroniques, médicaments en cours | TEXT |
| **Appointment** | Motif de consultation, type (chirurgie, urgence, vaccination...), description, notes | TEXT + ENUM |
| **Consent** | Détails spécifiques (procédure, risques, alternatives) | JSONB |

#### Niveau ÉLEVÉ — Données d'identification personnelle (PII)

| Modèle | Données |
|---|---|
| **Patient** | Nom, prénom, nom de naissance, date de naissance, lieu de naissance, sexe, nationalité, numéro de sécurité sociale, numéro d'identité (DNI/NIE/Passeport), adresse complète, téléphone, mobile, email, contact d'urgence (nom, téléphone, lien), représentant légal, assurance/mutuelle (numéro, fournisseur) |
| **User** | Nom, prénom, email, hash du mot de passe |
| **HealthcareProvider** | Nom, prénom, email, téléphone, mobile, hash du mot de passe, numéros professionnels (ADELI, RPPS, Ordre) |
| **Company** | Nom, email, téléphone, adresse, numéros d'enregistrement (SIRET/NIF, TVA) |
| **Document** (factures) | Nom acheteur/vendeur, adresse, email, téléphone, SIREN, numéro TVA, coordonnées bancaires |
| **Prescription** | Snapshot patient (nom, prénom, date de naissance, sexe, adresse, téléphone, email) + Snapshot praticien (nom, RPPS, ADELI, signature) |
| **Consent/ConsentSigningRequest** | Adresse IP, informations appareil (userAgent, plateforme, fuseau), image de signature (base64), email/téléphone du destinataire |

#### Niveau MODÉRÉ — Données techniques et comportementales

| Modèle | Données |
|---|---|
| **AuditLog** | ID utilisateur, type d'événement, adresse IP, User-Agent, changements (avant/après), horodatage |
| **UserClinicMembership** | Email, rôle dans la clinique, lien vers le praticien |
| **PatientCareTeam** | Relation patient-praticien, niveau d'accès, historique des attributions/révocations |
| **Appointment** | Lien patient-praticien, statut, historique de rappels, lien de téléconsultation |

#### Niveau FAIBLE — Données de configuration

| Modèle | Données |
|---|---|
| **ConsentTemplate / Translation** | Modèles de documents, métadonnées |
| **CustomMedication** | Catalogue de médicaments personnalisé |
| **PractitionerWeeklyAvailability** | Planning hebdomadaire |
| **DocumentSequence** | Compteurs de numérotation |
| **SystemCategory** | Catégories de gestion |

### 3.2 Volume et périmètre

| Indicateur | Valeur |
|---|---|
| Nombre de modèles de données | 20+ (dont 5 contiennent des données Art. 9) |
| Base de données par clinique | 33 tables + 1 vue |
| Nombre de cliniques (actuel) | [À COMPLÉTER] |
| Nombre de patients (estimation) | [À COMPLÉTER] |
| Nombre d'utilisateurs professionnels | [À COMPLÉTER] |
| Durée de conservation par défaut | Pas de politique formelle définie (voir §9) |

---

## 4. Base légale de chaque traitement

### 4.1 En qualité de sous-traitant (données patient)

En tant que sous-traitant, MEDIMaestro traite les données pour le compte de la clinique (responsable de traitement). La base légale relève de la responsabilité de chaque clinique. Néanmoins, le traitement s'appuie sur :

| Finalité | Base légale (clinique = RT) | Article RGPD | Justification |
|---|---|---|---|
| F1 — Dossiers médicaux | Médecine préventive ou du travail, diagnostics médicaux, prise en charge sanitaire | Art. 9(2)(h) + Art. 9(3) | Nécessaire à la prise en charge du patient par un professionnel de santé soumis au secret |
| F2 — Prescriptions | Idem | Art. 9(2)(h) | Acte médical nécessitant le traitement de données de santé |
| F3 — Rendez-vous | Exécution d'un contrat (relation de soin) | Art. 6(1)(b) | Nécessaire à l'organisation des soins |
| F4 — Consentement éclairé | Consentement explicite (pour les actes nécessitant consentement) + obligation légale (archivage du consentement) | Art. 9(2)(a) + Art. 6(1)(c) | Le consentement aux soins est requis par la législation sanitaire |
| F5 — Facturation | Obligation légale (fiscale) + exécution contractuelle | Art. 6(1)(b) + Art. 6(1)(c) | Obligations comptables et fiscales |

### 4.2 En qualité de responsable de traitement (données propres)

| Finalité | Base légale | Article RGPD | Justification |
|---|---|---|---|
| F6 — Gestion des utilisateurs | Exécution contractuelle | Art. 6(1)(b) | Nécessaire à la fourniture du service SaaS |
| F7 — Audit et traçabilité | Obligation légale + intérêt légitime | Art. 6(1)(c) + Art. 6(1)(f) | Obligation de traçabilité des accès aux données de santé (LOPDGDD) + sécurité du système |
| F8 — Sécurité | Intérêt légitime | Art. 6(1)(f) | Protection du système et des données contre les accès non autorisés |
| F9 — Administration plateforme | Exécution contractuelle | Art. 6(1)(b) | Nécessaire à la gestion de la relation client (cliniques) |

### 4.3 Pas de consentement marketing actif

Le modèle Patient contient un champ `consent_marketing` (BOOLEAN), mais aucun traitement marketing n'est actuellement implémenté. Si activé, la base légale sera le consentement explicite (Art. 6(1)(a)).

---

## 5. Flux de données

### 5.1 Diagramme des flux

```
                    ┌─────────────────┐
                    │   Patient        │
                    │ (navigateur)     │
                    └────────┬────────┘
                             │ HTTPS (signature consentement)
                             ▼
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Professionnel │───▶│   Nginx (TLS)   │◀───│  Admin Portal    │
│  de santé     │    │   Proxy inverse  │    │ (admin.medimaes-│
│ (navigateur)  │    └────────┬────────┘    │  tro.com)        │
└──────────────┘             │              └──────────────────┘
                             ▼
                    ┌─────────────────┐
                    │  Backend API     │
                    │  (Node.js)       │
                    └───┬────┬────┬───┘
                        │    │    │
               ┌────────┘    │    └────────┐
               ▼             ▼             ▼
        ┌────────────┐ ┌──────────┐ ┌──────────────┐
        │ BD Centrale │ │ BD Clin. │ │ [FOURNISSEUR │
        │ (users,     │ │ (données │ │  SMTP]       │
        │  companies) │ │  patient)│ │ (emails)     │
        └────────────┘ └──────────┘ └──────────────┘
               │             │
               ▼             ▼
        ┌─────────────────────────┐
        │  Sauvegardes chiffrées   │
        │  GPG (AES-256)          │
        │  Stockage local VPS     │
        │  + [BACKUP HORS SITE]   │
        └─────────────────────────┘
```

### 5.2 Points de collecte des données

| Point de collecte | Données collectées | Moyen |
|---|---|---|
| Création de compte praticien | Nom, prénom, email, mot de passe, spécialité, numéros professionnels | Formulaire web (HTTPS) |
| Enregistrement patient | Identité complète, coordonnées, numéro SS, assurance, contacts urgence, consentements | Formulaire web (HTTPS) — saisi par le professionnel |
| Consultation médicale | Motif, symptômes, examen, diagnostic, traitement, constantes, notes | Formulaire web (HTTPS) — saisi par le praticien |
| Prescription | Médicaments, posologie, instructions | Formulaire web (HTTPS) |
| Signature de consentement | Signature (image), IP, appareil, horodatage | Page publique de signature (HTTPS) |
| Facturation | Données patient et praticien (snapshot), montants | Formulaire web (HTTPS) |
| Connexion / Navigation | IP, User-Agent, actions effectuées | Collecte automatique (logs d'audit) |

### 5.3 Destinataires des données

| Destinataire | Données partagées | Base | Garanties |
|---|---|---|---|
| **Praticiens de la clinique** (selon permissions RBAC) | Données patient dans le périmètre de leur rôle | Art. 9(2)(h) + Art. 9(3) | RBAC 50+ permissions, isolation par BD, audit systématique |
| **[FOURNISSEUR SMTP]** | Email du destinataire, contenu du message (notifications, liens de signature) | Sous-traitance (Art. 28) | [DPA À ÉTABLIR] |
| **Hostinger** (hébergeur) | Toutes les données (accès physique aux serveurs) | Sous-traitance (Art. 28) | [DPA À ÉTABLIR — PRIORITÉ CRITIQUE] |
| **Let's Encrypt** | Nom de domaine uniquement | Intérêt légitime | Aucune donnée personnelle transmise |
| **Patient** (page de signature) | Son propre consentement à signer | Droit d'accès | Token UUID à durée limitée, HTTPS |

### 5.4 Transferts hors UE/EEE

| Transfert | Statut | Action requise |
|---|---|---|
| Hostinger VPS | [À CONFIRMER — localisation exacte du datacenter] | Obtenir confirmation écrite UE/EEE + DPA |
| [FOURNISSEUR SMTP] | [À CONFIRMER] | Vérifier localisation + clauses contractuelles types si hors UE |
| Aucun autre transfert identifié | — | — |

**Note** : Aucune API tierce de données de santé n'est utilisée. La validation INSEE/SIRET est un flux sortant ne contenant pas de données patient.

---

## 6. Nécessité et proportionnalité

### 6.1 Justification de la nécessité de chaque catégorie de données

| Catégorie | Nécessité | Proportionnalité |
|---|---|---|
| **Identité patient** (nom, prénom, date naissance) | Indispensable à l'identification du patient dans le parcours de soin | Minimale — seuls les champs requis par la réglementation sanitaire |
| **Numéro de sécurité sociale** | Requis pour la facturation et le remboursement des soins | Un seul champ — proportionnel |
| **Numéro d'identité** (DNI/NIE) | Identification formelle du patient dans le système de santé espagnol | Un seul champ — proportionnel |
| **Données de santé** (dossiers, diagnostics, traitements) | Indispensable à la prise en charge médicale | Structurées par type de consultation, avec notes privées séparées |
| **Constantes vitales** | Nécessaires au suivi médical et à la détection d'anomalies | Standard médical (poids, taille, TA, FC, T°, SpO2) |
| **Ordonnances** | Obligation légale de traçabilité des prescriptions | Snapshot figé à l'émission pour intégrité |
| **Consentements** (signature, IP, appareil) | Preuve du recueil du consentement éclairé (obligation légale sanitaire + RGPD) | Données minimales pour constituer une preuve valable |
| **Adresse IP / User-Agent** (audit) | Traçabilité des accès aux données de santé (obligation LOPDGDD) | Collecte automatique limitée au strict nécessaire |
| **Coordonnées contact** (email, téléphone) | Communication avec le patient (rappels, signature consentement) | Optionnels sauf email pour signature à distance |
| **Contact d'urgence** | Obligation déontologique médicale | Un seul contact — proportionnel |
| **Données de facturation** | Obligations fiscales et comptables | Minimum légal (identité, adresse, montants) |

### 6.2 Mesures de minimisation des données

| Mesure | Implémentation |
|---|---|
| **Champs optionnels** | Nombreux champs patient sont facultatifs (maiden_name, birth_place, mutual_insurance, etc.) |
| **Isolation des BD** | Les données d'une clinique ne sont jamais accessibles depuis une autre |
| **RBAC granulaire** | Le secrétariat n'a aucun accès aux données médicales ; les praticiens n'accèdent qu'à leur périmètre |
| **Notes privées** | Champ `private_notes` sur MedicalRecord visible uniquement par le praticien créateur |
| **Verrouillage post-signature** | Les dossiers médicaux signés (`is_signed`) deviennent en lecture seule (`is_locked`) |
| **Snapshots figés** | Les ordonnances contiennent un snapshot horodaté plutôt qu'une référence dynamique |
| **Exclusion API** | Les champs sensibles (hash mot de passe, secret TOTP, tokens) sont exclus de `toSafeJSON()` |
| **Soft-delete** | Suppression logique avec `deleted_at` + `paranoid: true` — conservation pour obligations légales |

### 6.3 Durées de conservation prévues

> **ATTENTION** : Aucune politique formelle de rétention n'est actuellement définie. Les durées ci-dessous sont les durées **recommandées** à implémenter.

| Catégorie | Durée recommandée | Base légale |
|---|---|---|
| Dossiers médicaux | **15 ans** minimum après dernière consultation (législation santé espagnole — Ley 41/2002 Art. 17) | Obligation légale |
| Ordonnances | **5 ans** après émission | Obligation légale |
| Consentements éclairés | **5 ans** après expiration ou révocation | Obligation légale + preuve |
| Données de facturation | **6 ans** (droit fiscal espagnol) | Obligation légale |
| Logs d'audit | **5 ans** minimum | Obligation légale (LOPDGDD) |
| Comptes utilisateurs | Durée de la relation contractuelle + **3 ans** | Prescription légale |
| Sauvegardes | **30 jours** (rotation actuelle) — **à aligner sur les durées ci-dessus** | — |

---

## 7. Évaluation des risques pour les droits et libertés

### 7.1 Méthodologie

L'évaluation utilise une matrice **Probabilité × Gravité** conformément aux lignes directrices WP248 :

- **Probabilité** : 1 (Négligeable) — 2 (Limitée) — 3 (Importante) — 4 (Maximale)
- **Gravité** : 1 (Négligeable) — 2 (Limitée) — 3 (Importante) — 4 (Maximale)
- **Risque** = Probabilité × Gravité → Faible (1-4) / Modéré (5-8) / Élevé (9-12) / Critique (13-16)

### 7.2 Matrice des risques

| # | Risque | Description de l'impact sur les personnes | Prob. | Grav. | Score | Niveau |
|---|---|---|---|---|---|---|
| R1 | **Violation de données de santé** (accès non autorisé à la BD) | Divulgation de diagnostics, traitements, pathologies → discrimination, atteinte à la vie privée, préjudice moral majeur | 2 | 4 | **8** | Modéré |
| R2 | **Usurpation de compte praticien** | Accès aux dossiers de tous les patients de la clinique, modification possible des dossiers médicaux | 2 | 4 | **8** | Modéré |
| R3 | **Fuite de données par le fournisseur SMTP** | Divulgation d'emails patient + contenu de notifications | 1 | 3 | **3** | Faible |
| R4 | **Accès non autorisé par un employé** (abus de privilèges) | Consultation de dossiers sans justification thérapeutique | 2 | 3 | **6** | Modéré |
| R5 | **Perte de données** (défaillance serveur, corruption BD) | Perte de dossiers médicaux → continuité des soins compromise | 2 | 4 | **8** | Modéré |
| R6 | **Défaut d'isolation multi-tenant** | Accès croisé entre cliniques → divulgation massive de données de santé | 1 | 4 | **4** | Faible |
| R7 | **Accès par l'hébergeur** (Hostinger) | Accès physique aux données en clair sur le serveur | 1 | 4 | **4** | Faible |
| R8 | **Impossibilité d'exercer les droits RGPD** | Patient ne pouvant pas accéder à ses données, obtenir leur portabilité ou leur effacement | 3 | 3 | **9** | Élevé |
| R9 | **Modification non détectée de dossiers médicaux** | Altération de diagnostics ou traitements sans trace → erreur médicale potentielle | 1 | 4 | **4** | Faible |
| R10 | **Conservation excessive** (absence de politique de rétention) | Données conservées au-delà du nécessaire → surface d'attaque élargie, violation du principe de limitation | 3 | 2 | **6** | Modéré |
| R11 | **Interception des communications** (email) | Interception des liens de signature de consentement | 1 | 3 | **3** | Faible |
| R12 | **Absence de notification de violation** | En cas de violation, impossibilité de notifier l'AEPD dans les 72h et les personnes concernées | 3 | 4 | **12** | Élevé |
| R13 | **Exploitation de vulnérabilités logicielles** | Dépendances npm non auditées → injection, exécution de code | 2 | 4 | **8** | Modéré |

### 7.3 Cartographie des risques

```
Gravité
  4 │  R6,R7,R9  │  R1,R2,R5,R13 │             │  R12
    │   Faible   │    Modéré      │   Élevé     │  Élevé
  3 │  R3,R11    │  R4            │  R8         │
    │   Faible   │    Modéré      │   Élevé     │
  2 │            │  R10           │             │
    │            │    Modéré      │             │
  1 │            │                │             │
    └────────────┼────────────────┼─────────────┼──────
         1              2               3           4
                                              Probabilité
```

---

## 8. Mesures de sécurité existantes

### 8.1 Contrôles techniques

#### Authentification et contrôle d'accès

| Mesure | Détail | Efficacité |
|---|---|---|
| **Hachage des mots de passe** | bcrypt cost factor 12, comparaison timing-safe | Forte |
| **JWT (JSON Web Token)** | Access token en mémoire (pas localStorage), durée 2h ; refresh token httpOnly + SameSite:strict, durée 7j | Forte |
| **TOTP (2FA)** | Backend implémenté : secret chiffré AES-256-GCM, codes de secours SHA-256 | Partielle (UI non déployée) |
| **RBAC** | 8 rôles, 50+ permissions granulaires, vérification sur chaque requête via middleware `requirePermission()` | Forte |
| **Détection de falsification de rôle** | Comparaison JWT vs BD sur chaque vérification de permission | Forte |
| **Rate limiting** | Nginx : login 1 req/s, API 10 req/s burst 20 ; Express : reset mdp 5/15min, 2FA 5/15min, API global 100/15min | Forte |

#### Protection des données

| Mesure | Détail | Efficacité |
|---|---|---|
| **Isolation multi-tenant** | 1 base de données PostgreSQL par clinique (`medicalpro_clinic_<UUID>`) | Forte |
| **Validation de membership** | Vérification de l'appartenance clinique sur chaque requête | Forte |
| **TLS 1.2/1.3** | Chiffrement en transit pour toutes les communications | Forte |
| **HSTS** | `max-age=31536000; includeSubDomains; preload` | Forte |
| **CSP (Content Security Policy)** | Politique stricte configurée dans Nginx | Forte |
| **Sauvegardes chiffrées** | GPG AES-256, rotation quotidienne automatisée (cron) | Forte |
| **Requêtes paramétrées** | Sequelize ORM — protection injection SQL | Forte |
| **Sanitisation XSS** | DOMPurify + middleware de sanitisation | Forte |
| **Chiffrement des secrets TOTP** | AES-256-GCM pour les secrets TOTP en base | Forte |
| **Exclusion des champs sensibles** | `toSafeJSON()` sur User, Company — exclut hash, tokens, secrets des réponses API | Forte |

#### Audit et traçabilité

| Mesure | Détail | Efficacité |
|---|---|---|
| **35 types d'événements d'audit** | Couvre authentification, patients, dossiers médicaux, facturation, consentements, sécurité, administration | Forte |
| **Insertion SQL directe** | Les logs d'audit contournent l'ORM (pas de hook `update()`) pour garantir l'immutabilité | Forte |
| **Capture IP + User-Agent** | Sur chaque événement d'audit | Forte |
| **Diff avant/après** | Champ `changes` JSON stockant l'état avant/après modification | Forte |
| **Export CSV** | Endpoint `/audit/export` pour extraction des logs | Modérée |
| **Journal d'accès MedicalRecord** | Champ `access_log` JSONB intégré au dossier médical | Forte |

#### Infrastructure

| Mesure | Détail | Efficacité |
|---|---|---|
| **Monitoring** | Health check toutes les 5 min, alertes Telegram (API, BD, disque, RAM) | Forte |
| **Rotation des logs** | pm2-logrotate : 10 Mo max, 7 jours, compression | Modérée |
| **Headers de sécurité** | X-Frame-Options, X-Content-Type-Options, Permissions-Policy, X-Robots-Tag | Forte |

### 8.2 Contrôles organisationnels

| Mesure | Détail | Efficacité |
|---|---|---|
| **Séparation des rôles** | 8 niveaux de rôles avec permissions distinctes | Forte |
| **Secret professionnel** | Les praticiens sont soumis au secret médical (obligation déontologique) | Forte |
| **Soft-delete** | Suppression logique sur patients, consentements, praticiens — conservation pour obligations légales | Modérée |
| **Verrouillage des dossiers signés** | `is_locked = true` après signature médicale | Forte |
| **Snapshots figés** | Ordonnances avec snapshot patient/praticien horodaté | Forte |

---

## 9. Risques résiduels et plan de remédiation

### 9.1 Actions critiques (à réaliser sous 30 jours)

| # | Risque adressé | Action | Responsable | Échéance | Statut |
|---|---|---|---|---|---|
| A1 | R12 | **Rédiger la procédure de gestion des incidents et notification AEPD (72h)** — Inclure : détection, évaluation, notification AEPD, communication aux personnes, registre des violations | [DPO] | [DATE] | À faire |
| A2 | R7 | **Signer un DPA (Data Processing Agreement) avec Hostinger** — Confirmer la localisation UE du datacenter, obtenir les garanties Art. 28 | [RESPONSABLE] | [DATE] | À faire |
| A3 | — | **Rédiger le registre des traitements (Art. 30 RGPD)** — Documenter chaque traitement avec finalité, base légale, catégories de données, destinataires, durées de conservation | [DPO] | [DATE] | À faire |
| A4 | R3 | **Signer un DPA avec [FOURNISSEUR SMTP]** — Vérifier localisation, clauses contractuelles types si hors UE | [RESPONSABLE] | [DATE] | À faire |
| A5 | R2 | **Déployer l'interface 2FA (TOTP)** — Le backend est prêt, l'UI frontend doit être implémentée ; activer pour tous les comptes à accès médical | [DEV] | [DATE] | À faire |

### 9.2 Actions haute priorité (à réaliser sous 90 jours)

| # | Risque adressé | Action | Responsable | Échéance | Statut |
|---|---|---|---|---|---|
| A6 | R8 | **Implémenter le droit à la portabilité (Art. 20)** — Endpoint `/patients/:id/export` retournant les données en format structuré (JSON/PDF) | [DEV] | [DATE] | À faire |
| A7 | R10 | **Définir et implémenter la politique de rétention des données** — Conformément aux durées du §6.3, avec purge automatisée ou archivage | [DPO] + [DEV] | [DATE] | À faire |
| A8 | R13 | **Intégrer `npm audit` dans le pipeline CI/CD** — Blocage du déploiement en cas de vulnérabilité critique | [DEV] | [DATE] | À faire |
| A9 | R9 | **Protéger les audit_logs au niveau PostgreSQL** — `REVOKE DELETE, UPDATE ON audit_logs FROM application_user;` | [DEV] | [DATE] | À faire |
| A10 | R5 | **Configurer la sauvegarde hors site** — Réplication chiffrée vers un serveur externe via rclone (SFTP/SSH) | [ADMIN] | [DATE] | À faire |
| A11 | R1 | **Chiffrer les données PII sensibles au repos** — Chiffrement au niveau champ pour : `social_security`, `id_number`, et optionnellement les champs cliniques JSONB | [DEV] | [DATE] | À faire |
| A12 | R1 | **Séparer les fichiers d'environnement dev/prod** — `.env.development` + `.env.production` pour empêcher l'embarquement de `localhost` en production | [DEV] | [DATE] | À faire |

### 9.3 Actions complémentaires (à réaliser sous 6 mois)

| # | Risque adressé | Action | Responsable | Échéance | Statut |
|---|---|---|---|---|---|
| A13 | R4 | **Finaliser l'interface "Équipe de soins"** — Activer le filtrage par `PatientCareTeam` et retirer la permission `PATIENTS_VIEW_ALL` du rôle physician | [DEV] | [DATE] | À faire |
| A14 | R1 | **Confirmer le chiffrement disque du VPS** — Vérifier LUKS ou équivalent auprès de Hostinger | [ADMIN] | [DATE] | À faire |
| A15 | R2 | **Implémenter la rotation des clés** — JWT_SECRET, DB_PASSWORD, TOTP_ENCRYPTION_KEY avec calendrier défini | [DEV] + [ADMIN] | [DATE] | À faire |
| A16 | R4 | **Configurer l'audit SSH** — Installation et configuration de `auditd` sur le serveur de production | [ADMIN] | [DATE] | À faire |
| A17 | R8 | **Mettre en place une procédure d'exercice des droits RGPD** — Formulaire de demande, délais de traitement (30 jours), processus documenté | [DPO] | [DATE] | À faire |
| A18 | — | **Former le personnel aux obligations RGPD** — Sessions de sensibilisation pour les utilisateurs de la plateforme | [DPO] | [DATE] | À faire |

### 9.4 Tableau de synthèse des risques après remédiation

| Risque | Niveau actuel | Actions | Niveau cible |
|---|---|---|---|
| R1 — Violation de données | Modéré (8) | A11, A14, A12 | Faible (4) |
| R2 — Usurpation de compte | Modéré (8) | A5, A15 | Faible (3) |
| R3 — Fuite via SMTP | Faible (3) | A4 | Faible (2) |
| R4 — Abus de privilèges | Modéré (6) | A13, A16 | Faible (3) |
| R5 — Perte de données | Modéré (8) | A10 | Faible (4) |
| R6 — Défaut isolation | Faible (4) | — (déjà solide) | Faible (4) |
| R7 — Accès hébergeur | Faible (4) | A2, A14 | Faible (2) |
| R8 — Droits RGPD impossibles | Élevé (9) | A6, A17 | Faible (3) |
| R9 — Modification non détectée | Faible (4) | A9 | Négligeable (2) |
| R10 — Conservation excessive | Modéré (6) | A7 | Faible (2) |
| R11 — Interception email | Faible (3) | — (TLS suffisant) | Faible (3) |
| R12 — Absence notification | Élevé (12) | A1 | Faible (4) |
| R13 — Vulnérabilités logicielles | Modéré (8) | A8 | Faible (4) |

---

## 10. Droits des personnes concernées

### 10.1 État d'implémentation

| Droit | Article RGPD | Statut | Détail |
|---|---|---|---|
| **Information** | Art. 13, 14 | **Partiel** | Politique de confidentialité à rédiger/publier |
| **Accès** | Art. 15 | **Partiel** | Logs d'audit consultables ; pas de portail patient en self-service |
| **Rectification** | Art. 16 | **Implémenté** | Endpoints PUT/PATCH sur patient et dossiers médicaux |
| **Effacement** | Art. 17 | **Partiel** | Soft-delete implémenté ; pas de purge automatisée ; dossiers médicaux exclus (obligation de conservation) |
| **Limitation** | Art. 18 | **Non implémenté** | Pas de flag de restriction sur les données |
| **Portabilité** | Art. 20 | **Non implémenté** | Pas d'endpoint d'export structuré (action A6) |
| **Opposition** | Art. 21 | **Partiel** | Révocation de consentement disponible ; pas d'opposition générale au traitement |
| **Retrait du consentement** | Art. 7(3) | **Implémenté** | Workflow de révocation complet avec motif et horodatage |
| **Non-profilage** | Art. 22 | **Non applicable** | Aucune décision automatisée basée sur le profilage |

### 10.2 Procédure d'exercice des droits (à implémenter — action A17)

La procédure devra inclure :
1. Point de contact : [EMAIL DPO] ou formulaire dédié
2. Vérification de l'identité du demandeur
3. Délai de réponse : 30 jours maximum (extensible à 60 jours si complexité)
4. Traçabilité : enregistrement de chaque demande et de la réponse apportée
5. Cas particuliers : dossiers médicaux (conservation obligatoire 15 ans), données partagées entre cliniques (coordination entre RT)

---

## 11. Transferts de données

### 11.1 Sous-traitants

| Sous-traitant | Service | Données concernées | Localisation | DPA signé | Garanties transfert |
|---|---|---|---|---|---|
| **Hostinger** | Hébergement VPS | Toutes les données (accès physique) | [À CONFIRMER — UE/EEE ?] | **NON — CRITIQUE** | [À ÉTABLIR] |
| **[FOURNISSEUR SMTP]** | Email transactionnel | Adresses email, contenu des messages | [À CONFIRMER] | **NON** | [À ÉTABLIR] |
| **Let's Encrypt** | Certificats TLS | Noms de domaine uniquement | USA (ISRG) | N/A | Pas de données personnelles |

### 11.2 Transferts hors UE/EEE

À la date de rédaction, aucun transfert hors UE/EEE n'est confirmé. Si la localisation du datacenter Hostinger ou du fournisseur SMTP est hors UE/EEE, les mécanismes suivants devront être mis en place :

- **Clauses Contractuelles Types (CCT)** — Décision d'exécution (UE) 2021/914
- **Évaluation de l'impact du transfert (TIA)** — conformément à l'arrêt Schrems II
- **Mesures supplémentaires** si nécessaire (chiffrement, pseudonymisation)

---

## 12. Avis du DPO et validation

### 12.1 Avis du DPO

| Champ | Contenu |
|---|---|
| **Date de l'avis** | [DATE] |
| **DPO** | [NOM DPO] |
| **Avis** | [FAVORABLE / FAVORABLE AVEC RÉSERVES / DÉFAVORABLE] |
| **Observations** | [COMMENTAIRES DU DPO] |
| **Conditions** | [CONDITIONS POUR UN AVIS FAVORABLE, LE CAS ÉCHÉANT] |

### 12.2 Décision du responsable de traitement

| Champ | Contenu |
|---|---|
| **Date** | [DATE] |
| **Décideur** | [NOM ET FONCTION] |
| **Décision** | [PROCÉDER AU TRAITEMENT / SUSPENDRE / MODIFIER] |
| **Justification** | [MOTIVATION DE LA DÉCISION] |
| **Signature** | _________________________________ |

### 12.3 Consultation préalable de l'AEPD (Art. 36)

Si, après mise en oeuvre des mesures de remédiation, le risque résiduel reste élevé pour certains traitements, une consultation préalable de l'AEPD sera nécessaire (Art. 36 RGPD).

**État actuel** : La consultation préalable n'est pas requise à ce stade, sous réserve de la mise en oeuvre effective des actions critiques A1-A5 dans les délais impartis.

---

## 13. Historique des révisions

| Version | Date | Auteur | Modifications |
|---|---|---|---|
| 1.0 | 26/02/2026 | [AUTEUR] | Création initiale du DPIA |
| | | | |

---

## Annexes

### Annexe A — Liste des 35 types d'événements d'audit

| Catégorie | Événements |
|---|---|
| Authentification | `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `TOKEN_REFRESH` |
| Utilisateurs | `USER_CREATED`, `USER_MODIFIED`, `USER_DELETED`, `USER_PERMISSIONS_CHANGED`, `USER_ACTIVATED`, `USER_DEACTIVATED` |
| Patients | `PATIENT_CREATED`, `PATIENT_MODIFIED`, `PATIENT_DELETED`, `PATIENT_EXPORTED`, `PATIENT_DATA_ACCESSED` |
| Rendez-vous | `APPOINTMENT_CREATED`, `APPOINTMENT_MODIFIED`, `APPOINTMENT_DELETED`, `APPOINTMENT_CONFIRMED` |
| Dossiers médicaux | `MEDICAL_RECORD_ACCESSED`, `MEDICAL_RECORD_MODIFIED`, `MEDICAL_NOTE_CREATED` |
| Facturation | `INVOICE_CREATED`, `INVOICE_MODIFIED`, `INVOICE_DELETED`, `INVOICE_SENT` |
| Consentements | `CONSENT_SIGNED`, `CONSENT_REVOKED` |
| Sécurité | `PERMISSION_DENIED`, `TOKEN_TAMPER_DETECTED`, `COMPANY_MISMATCH_DETECTED`, `UNAUTHORIZED_ACCESS_ATTEMPT` |
| Administration | `SETTINGS_CHANGED`, `AUDIT_LOGS_VIEWED`, `AUDIT_LOGS_EXPORTED`, `AUDIT_LOGS_DELETED` |

### Annexe B — Matrice des permissions RBAC (extrait)

| Module | super_admin | admin | physician | nurse | practitioner | secretary | readonly |
|---|---|---|---|---|---|---|---|
| patients.* | Toutes | Toutes | Toutes | Lecture + édition | Lecture + édition limitée | Lecture (identité seule) | Lecture |
| medical_records.* | Toutes | Lecture + édition | Toutes | Lecture + édition | Lecture | Aucune | Lecture |
| prescriptions.* | Toutes | Lecture | Toutes | Lecture | Aucune | Aucune | Aucune |
| consents.* | Toutes | Toutes | Toutes | Lecture + signature | Lecture | Aucune | Lecture |
| invoices.* | Toutes | Toutes | Lecture | Aucune | Aucune | Toutes | Lecture |
| audit.* | Toutes | Lecture + export | Aucune | Aucune | Aucune | Aucune | Aucune |
| users.* | Toutes | Toutes | Aucune | Aucune | Aucune | Aucune | Aucune |
| settings.* | Toutes | Toutes | Lecture | Aucune | Aucune | Aucune | Aucune |

### Annexe C — Références réglementaires

- **RGPD** — Règlement (UE) 2016/679 du 27 avril 2016
- **LOPDGDD** — Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales
- **Ley 41/2002** — Ley básica reguladora de la autonomía del paciente y de derechos y obligaciones en materia de información y documentación clínica
- **WP248 rev.01** — Lignes directrices concernant l'analyse d'impact relative à la protection des données (AIPD) — Groupe de travail «Article 29» / CEPD
- **Décision d'exécution (UE) 2021/914** — Clauses contractuelles types pour les transferts internationaux
- **Arrêt Schrems II** — CJUE, 16 juillet 2020, C-311/18

---

*Ce document constitue une analyse d'impact relative à la protection des données (DPIA/AIPD) au sens de l'article 35 du RGPD. Il doit être révisé au minimum une fois par an et à chaque modification substantielle des traitements décrits.*

*Les placeholders entre crochets [XXX] doivent être complétés avant la validation finale par le DPO.*
