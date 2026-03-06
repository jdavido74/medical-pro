# Portail Pre-consultation — Suivi d'execution

**Plan:** `docs/plans/2026-03-06-portail-preconsultation-plan.md`
**Design:** `docs/plans/2026-03-06-portail-preconsultation-design.md`
**Debut:** 2026-03-06
**Derniere MAJ:** 2026-03-06

---

## Statut global

| Phase | Description | Statut | Notes |
|---|---|---|---|
| 1 | Migrations DB + modeles Sequelize | TERMINE | Taches 1-5 |
| 2 | Service stockage fichiers chiffre | TERMINE | Tache 6 |
| 3 | Permissions RBAC | TERMINE | Tache 7 |
| 4 | Templates email (FR/ES/EN) | TERMINE | Tache 8 |
| 5 | Routes publiques (portail patient) | TERMINE | Tache 9 |
| 6 | Routes staff + cron rappel | TERMINE | Taches 10-11 |
| 7 | Traductions i18n | TERMINE | Tache 12 |
| 8 | Client API frontend | TERMINE | Tache 13 |
| 9 | UI portail patient (6 composants) | TERMINE | Taches 14-19 |
| 10 | Integration dashboard staff | TERMINE | Taches 20-22 |
| 11 | Deploiement production | EN ATTENTE | Tache 23 |
| 12 | Tests integration E2E | EN ATTENTE | Tache 24 |

## Detail des taches

| Tache | Description | Statut | Commit | Blockers |
|---|---|---|---|---|
| 1 | Migration: preconsultation_tokens | TERMINE | e8b9c40 | - |
| 2 | Migration: patient_documents | TERMINE | e8b9c40 | - |
| 3 | Migration: appointment preconsultation_status | TERMINE | e8b9c40 | - |
| 4 | Modele: PreconsultationToken | TERMINE | 8df84bb | - |
| 5 | Modele: PatientDocument | TERMINE | 8df84bb | - |
| 6 | Service stockage fichiers chiffre | TERMINE | ffd3365 | file-type v16 (CJS) au lieu de v21 (ESM) |
| 7 | Permissions RBAC (backend + frontend) | TERMINE | fa08e21 / 9fcb31c | - |
| 8 | Templates email preconsultation | TERMINE | 3877638 | Service separé (emailService.js fait 2475 lignes) |
| 9 | Routes publiques (patient portal API) | TERMINE | 30d9bc7 | + preconsultation_status dans Appointment model |
| 10 | Routes staff (preconsultation + documents) | TERMINE | 015bdb5 | - |
| 11 | Cron rappel 24h (desactive) | TERMINE | 015bdb5 | ENABLE_APPOINTMENT_REMINDERS=false |
| 12 | Traductions i18n (ES/FR/EN) | TERMINE | 98d3bfd | - |
| 13 | Client API frontend | TERMINE | 98d3bfd | - |
| 14 | Page preconsultation: routing + layout | TERMINE | b4952df | - |
| 15 | Patient info form + MRZ scanner | TERMINE | b4952df | mrz@5.0.1 |
| 16 | Document upload step | TERMINE | b4952df | react-dropzone@15.0.0 |
| 17 | Confirmation step | TERMINE | b4952df | - |
| 18 | Date selection step | TERMINE | b4952df | - |
| 19 | Quote validation step | TERMINE | b4952df | - |
| 20 | Status badge sur appointments dashboard | TERMINE | c723cc3 | - |
| 21 | Boutons action preconsultation | TERMINE | c723cc3 | send-link + send-reminder |
| 22 | Onglet documents dans PatientDetailModal | TERMINE | c723cc3 | preview image/PDF + delete RBAC |
| 23 | Deploiement production | EN ATTENTE | - | - |
| 24 | Tests integration E2E | EN ATTENTE | - | - |

## En cas de reprise apres plantage

1. Lire ce fichier pour connaitre la derniere tache completee
2. Lire le plan: `docs/plans/2026-03-06-portail-preconsultation-plan.md`
3. Lire le design: `docs/plans/2026-03-06-portail-preconsultation-design.md`
4. Verifier `git log --oneline -20` pour confirmer les commits deja faits
5. Reprendre a la premiere tache EN ATTENTE ou EN COURS
6. Repos backend: `/var/www/medical-pro-backend`
7. Repos frontend: `/var/www/medical-pro`
8. Le skill a utiliser: `superpowers:executing-plans`

## Decisions prises en cours d'execution

- Branches: `feature/preconsultation` sur les deux repos (backend + frontend)
- Taches 1-3 groupees en un seul commit (migrations liees)
- Taches 4-5 groupees en un seul commit (modeles + ModelFactory)
- Le modele PreconsultationToken utilise STRING(30) au lieu d'ENUM Sequelize pour le status (plus flexible, la DB a le vrai ENUM)
- PatientDocument a `updatedAt: false` car la table n'a pas de colonne updated_at

## Erreurs rencontrees et solutions

(Section pour documenter les problemes et leurs resolutions)
