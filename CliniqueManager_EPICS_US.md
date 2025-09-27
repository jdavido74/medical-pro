# Clinique Manager – EPICs & User Stories

## Epic 1 – Création et gestion du compte clinique
- **US1.1** : En tant que *Super Admin plateforme*, je veux créer un compte client (clinique) afin d’y associer un responsable.
- **US1.2** : En tant que *Responsable clinique*, je veux créer et gérer les utilisateurs (secrétaires, praticiens, infirmiers) et leur attribuer des rôles et droits.
- **US1.3** : En tant que *Responsable clinique*, je veux gérer les infos générales de la clinique (nom, adresse, contacts).

## Epic 2 – Gestion des patients
- **US2.1** : En tant que *Secrétaire*, je veux enregistrer les infos générales d’un patient (identité, coordonnées, documents).
- **US2.2** : En tant que *Praticien*, je veux accéder à des questionnaires spécifiques selon mes disciplines (ex. ostéopathie, acupuncture).
- **US2.3** : En tant que *Responsable/Secrétaire/Praticien*, je veux gérer les consentements patients (RGPD + traitements spécifiques) depuis un **catalogue centralisé**, automatisés en fonction des pratiques.

## Epic 3 – Gestion des employés
- **US3.1** : En tant que *Responsable clinique*, je veux créer et gérer les fiches employés (infos, rôle, rattachement).
- **US3.2** : En tant que *Responsable clinique*, je veux assigner plusieurs disciplines à un praticien.

## Epic 4 – Rendez-vous, traitements et salles
- **US4.1** : En tant que *Secrétaire*, je veux planifier un rendez-vous (patient, praticien, salle, service).
- **US4.2** : En tant que *Praticien*, je veux enregistrer un traitement (pratique, produit, diagnostic, notes).
- **US4.3** : En tant que *Responsable*, je veux gérer les salles et leur disponibilité.
- **US4.4** : En tant que *Patient*, je veux recevoir une confirmation et un rappel automatique de mon rendez-vous.

## Epic 5 – Gestion des droits et sécurité
- **US5.1** : En tant que *Responsable clinique*, je veux gérer les droits d’accès par rôle.
- **US5.2** : En tant que *Super Admin plateforme*, je veux superviser la conformité RGPD.

## Epic 6 – Facturation et devis
- **US6.1** : Générer un devis depuis un rendez-vous.
- **US6.2** : Éditer un devis (ajout/suppression lignes, remise % ou montant).
- **US6.3** : Transformer un devis validé en facture.
- **US6.4** : Générer directement une facture depuis un patient ou un rendez-vous.
- **US6.5** : Accéder à l’historique des devis/factures par patient.
- **US6.6** : Envoyer un devis par email (PDF + lien sécurisé).
- **US6.7** : Permettre au *patient* de consulter et valider/refuser son devis en ligne.
- **US6.8** : Recevoir une notification lors de la validation/refus d’un devis.

## Epic 7 – Produits, services et bundles
- **US7.1** : Créer et gérer des produits/services (nom, description, tarif).
- **US7.2** : Créer des **bundles** de produits/services avec tarif initial calculé (somme des éléments) mais ajustable librement.
- **US7.3** : Gérer la mise à jour des prix et leur impact sur les bundles.
