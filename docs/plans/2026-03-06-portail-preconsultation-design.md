# Portail Pre-consultation Patient — Design Document

**Date** : 2026-03-06
**Statut** : Approuve
**Auteur** : Claude Opus 4.6 + Jose David

---

## 1. Objectif

Permettre aux patients de remplir leur fiche, transmettre des documents medicaux et gerer leur rendez-vous avant la consultation, via un lien securise envoye par email. Apres la consultation, la secretaire envoie un devis au patient pour validation en ligne.

## 2. Principes directeurs

- Acces patient par token securise (pas de compte) — pattern existant `/public-consent-signing`
- Documents medicaux stockes hors du webroot, chiffres, accessibles uniquement via API
- Tout le parcours dans la langue du patient (FR/ES/EN)
- Experience mobile-first avec UX specifique desktop et mobile
- Conformite RGPD Art. 9 (donnees de sante) + secret medical

## 3. Flux principal

```
Secretaire cree RDV
  -> Bouton "Envoyer lien pre-consultation"
  -> Email au patient (dans sa langue)
  -> Patient clique le lien
  -> Page publique tokenisee :
     1. Remplit sa fiche patient (nom, prenom, tel, email, date naissance, adresse)
     2. Uploade ses documents (ordonnances, resultats, etc.)
     3. Confirme / annule / demande modification du RDV
  -> Secretaire notifiee par email a chaque action
  -> Etat visible sur le dashboard

Consultation realisee
  -> Secretaire cree le devis (systeme existant)
  -> Bouton "Envoyer devis au patient"
  -> Email au patient avec lien securise
  -> Patient visualise le PDF, accepte ou refuse
  -> Secretaire notifiee par email
```

## 4. Architecture backend

### 4.1 Nouveau modele `PreconsultationToken` (table clinic DB)

| Champ | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| appointment_id | INTEGER FK | Lien vers le RDV |
| patient_id | INTEGER FK | Lien vers le patient |
| token | UUID | Token cryptographique unique |
| language | VARCHAR(5) | Langue du patient (fr/es/en) |
| status | ENUM | Etat courant du parcours |
| expires_at | TIMESTAMP | Expiration du token (defaut 7 jours) |
| created_by | INTEGER FK | Utilisateur staff ayant envoye le lien |
| created_at | TIMESTAMP | Date de creation |
| updated_at | TIMESTAMP | Derniere mise a jour |

**Statuts possibles** :
- `sent` — Lien envoye
- `patient_info_completed` — Fiche remplie
- `documents_uploaded` — Documents recus
- `confirmed` — RDV confirme par le patient
- `modification_requested` — Demande de modification
- `cancelled` — Annule par le patient
- `quote_sent` — Devis envoye
- `quote_accepted` — Devis accepte
- `quote_rejected` — Devis refuse

### 4.2 Nouveau modele `PatientDocument` (table clinic DB)

| Champ | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| patient_id | INTEGER FK | Patient proprietaire |
| appointment_id | INTEGER FK | RDV associe (nullable) |
| medical_record_id | INTEGER FK | Dossier medical associe (nullable) |
| original_filename | VARCHAR(255) | Nom original du fichier |
| stored_filename | UUID | Nom de stockage (non devinable) |
| mime_type | VARCHAR(100) | Type MIME valide cote serveur |
| size | INTEGER | Taille en octets |
| uploaded_by_type | ENUM | 'patient' ou 'staff' |
| uploaded_by_id | INTEGER | ID du patient ou de l'utilisateur staff |
| retention_expires_at | TIMESTAMP | Date d'expiration retention (defaut +15 ans) |
| created_at | TIMESTAMP | Date d'upload |

### 4.3 Stockage fichiers

- **Emplacement** : `/var/lib/medimaestro/documents/{clinicId}/{patientId}/`
- **Hors du webroot** — Nginx n'a aucune route vers ce dossier
- **Chiffrement au repos** : AES-256-GCM, cle par fichier ou cle globale dans `.env`
- **Nommage** : UUID v4 (pas de nom original sur le disque)
- **Validation serveur** : verification MIME type reel (magic bytes), pas juste l'extension
- **Limites** : 10 Mo max par fichier, 10 fichiers max par pre-consultation
- **Types acceptes** : JPG, PNG, PDF, DOC, DOCX, XLS, XLSX
- **Acces** : streaming via API avec headers `Content-Disposition: inline`, `Cache-Control: no-store`

### 4.4 Routes publiques (token patient)

| Methode | Route | Description |
|---|---|---|
| GET | `/api/v1/public-preconsultation/:token` | Charge la page (etat, infos RDV) |
| PUT | `/api/v1/public-preconsultation/:token/patient-info` | Soumet la fiche patient |
| POST | `/api/v1/public-preconsultation/:token/documents` | Upload fichiers (multer) |
| GET | `/api/v1/public-preconsultation/:token/documents/:docId/file` | Visualise un fichier |
| DELETE | `/api/v1/public-preconsultation/:token/documents/:docId` | Supprime un fichier uploade |
| POST | `/api/v1/public-preconsultation/:token/confirm` | Confirme le RDV |
| POST | `/api/v1/public-preconsultation/:token/cancel` | Annule (si > 24h avant RDV) |
| POST | `/api/v1/public-preconsultation/:token/request-modification` | Demande modification |
| POST | `/api/v1/public-preconsultation/:token/select-date` | Choisit un creneau propose |
| GET | `/api/v1/public-preconsultation/:token/quote` | Visualise le devis PDF |
| POST | `/api/v1/public-preconsultation/:token/quote/accept` | Accepte le devis |
| POST | `/api/v1/public-preconsultation/:token/quote/reject` | Refuse le devis |

### 4.5 Routes staff (authentifiees, RBAC)

| Methode | Route | Description |
|---|---|---|
| POST | `/api/v1/appointments/:id/send-preconsultation` | Envoie le lien au patient |
| POST | `/api/v1/appointments/:id/send-reminder` | Envoie un rappel manuellement |
| POST | `/api/v1/appointments/:id/propose-dates` | Propose des creneaux (modif demandee) |
| POST | `/api/v1/appointments/:id/send-quote` | Envoie le devis au patient |
| GET | `/api/v1/patients/:id/documents` | Liste les documents du patient |
| GET | `/api/v1/patients/:id/documents/:docId/file` | Streame un fichier (RBAC) |
| DELETE | `/api/v1/patients/:id/documents/:docId` | Supprime un document (admin) |

### 4.6 Cron rappel 24h (implemente mais desactive)

- Script Node ou bash identifiant les RDV a J-1 avec statut `confirmed` ou `sent`
- Envoie email de rappel avec lien confirmer/modifier/annuler
- Active via `ENABLE_APPOINTMENT_REMINDERS=true` dans `.env` (defaut `false`)
- Frequence : toutes les heures (cron)

### 4.7 Templates email (multilingues FR/ES/EN)

| Template | Destinataire | Declencheur |
|---|---|---|
| `preconsultation_link` | Patient | Bouton "Envoyer lien" |
| `appointment_reminder` | Patient | Bouton rappel ou cron 24h |
| `proposed_dates` | Patient | Secretaire propose des creneaux |
| `quote_to_patient` | Patient | Bouton "Envoyer devis" |
| `patient_info_completed_staff` | Secretaire | Patient remplit sa fiche |
| `documents_uploaded_staff` | Secretaire | Patient uploade documents |
| `appointment_confirmed_staff` | Secretaire | Patient confirme RDV |
| `appointment_cancelled_staff` | Secretaire | Patient annule RDV |
| `modification_requested_staff` | Secretaire | Patient demande modification |
| `date_selected_staff` | Secretaire | Patient choisit un creneau |
| `quote_accepted_staff` | Secretaire | Patient accepte devis |
| `quote_rejected_staff` | Secretaire | Patient refuse devis |

## 5. Frontend staff

### 5.1 Dashboard — Indicateur d'etat RDV

Pastille coloree + label sur chaque ligne de RDV dans le dashboard :

| Etat | Couleur | Label |
|---|---|---|
| Lien envoye | Gris | Lien envoye |
| Fiche remplie | Bleu clair | Fiche remplie |
| Documents recus | Bleu | Documents recus |
| Confirme | Vert | Confirme |
| Modification demandee | Orange | Modif. demandee |
| Annule par patient | Rouge | Annule |
| Devis envoye | Violet | Devis envoye |
| Devis accepte | Vert fonce | Devis accepte |
| Devis refuse | Rouge fonce | Devis refuse |

Filtre par etat disponible dans la liste des RDV.

### 5.2 Fiche RDV — Nouveaux boutons

- **"Envoyer lien pre-consultation"** — permission `preconsultation.send` (admin, secretary)
- **"Envoyer rappel"** — permission `preconsultation.manage` (admin, secretary)
- **"Proposer des dates"** — visible si etat = `modification_requested` (admin, secretary)
- **"Envoyer devis"** — permission `quotes.send` (admin, secretary)

### 5.3 Fiche patient — Onglet Documents

- Liste des documents uploades (nom, date, taille, type, RDV associe)
- Clic = visualisation inline (PDF dans iframe, images dans modal)
- Documents automatiquement rattaches au dossier medical
- Suppression par admin uniquement
- Audit de chaque consultation de document

## 6. Frontend patient (pages publiques)

### 6.1 Experience responsive : mobile vs desktop

**Mobile** (< 768px) :
- Flow vertical type wizard, une etape a la fois
- Upload via appareil photo (capture directe) + selection fichier
- Gros boutons tactiles, espacement genereux
- Navigation par boutons Suivant/Precedent
- Stepper vertical minimal en haut

**Desktop** (>= 768px) :
- Stepper horizontal avec toutes les etapes visibles
- Layout plus large, previsualisations cote a cote
- Drag & drop pour l'upload de documents
- Panneau lateral avec resume du RDV

### 6.2 Page pre-consultation (tokenisee)

**Etape 1 — Fiche patient** :
- Option "Scanner ma piece d'identite" : prise de photo (mobile) ou upload scan (desktop)
  - Lecture de la zone MRZ cote client (librairies JS `mrz-detection` + `mrz`)
  - Pre-remplit : nom, prenom, date de naissance, sexe, nationalite, numero de document
  - La photo n'est PAS envoyee au serveur (traitement 100% client, minimisation RGPD)
  - Le patient peut choisir d'uploader le document comme piece justificative (optionnel)
  - Supporte : passeports (OACI), DNI espagnol, NIE, cartes d'identite UE
- Champs : nom, prenom, telephone, email, date de naissance, sexe, nationalite, numero document, adresse (rue, CP, ville, pays)
- Pre-remplie si le patient existe deja (profil provisoire) ou via MRZ
- Le patient verifie, corrige si besoin, et complete l'adresse manuellement
- Validation cote client + serveur

**Etape 2 — Documents** :
- Zone d'upload (drag & drop desktop / bouton + camera mobile)
- Liste des fichiers uploades avec previsualisation miniature
- Possibilite de supprimer un fichier avant soumission
- Indicateur de progression pendant l'upload
- Compteur fichiers (X/10) et taille restante

**Etape 3 — Confirmation RDV** :
- Resume : date, heure, praticien, motif
- Trois actions : Confirmer / Demander modification / Annuler
- Annulation possible seulement si > 24h avant le RDV
- Message explicatif si annulation impossible (trop tard)

**Page selection de creneau** (si modification) :
- Liste des creneaux proposes par la secretaire
- Le patient en choisit un
- Confirmation immediate

### 6.3 Page devis (tokenisee)

- Visualisation du PDF inline (iframe)
- Resume du montant total
- Boutons : Accepter / Refuser
- Horodatage de la decision (preuve juridique)
- Page de confirmation apres action

### 6.4 Langue

- La langue est determinee par le champ `language` du `PreconsultationToken`
- L'interface s'affiche dans la langue du patient
- Tous les textes via i18n (namespaces `preconsultation` FR/ES/EN)

## 7. Securite & RGPD

### 7.1 Tokens
- UUID v4 cryptographique (`crypto.randomUUID()`)
- Expiration configurable (defaut 7 jours)
- Usage unique par parcours (un token = un RDV)
- Invalide apres expiration ou completion du parcours

### 7.2 Fichiers
- Stockes hors webroot (`/var/lib/medimaestro/documents/`)
- Chiffres au repos AES-256-GCM
- Noms de fichiers UUID (non devinables)
- Streaming via API avec verification token/RBAC
- Headers : `Content-Disposition: inline`, `Cache-Control: no-store`
- Validation MIME type cote serveur (magic bytes)
- `retention_expires_at` = 15 ans par defaut

### 7.3 Rate limiting
- Routes publiques : 10 req/min par IP (upload : 5 req/min)
- Protection contre brute-force de tokens

### 7.4 Audit
- Chaque action tracee dans `audit_logs` :
  - Patient : consultation fiche, upload document, confirmation, annulation, acceptation devis
  - Staff : envoi lien, consultation document, envoi devis

### 7.5 RGPD
- Base legale : interet legitime (gestion du RDV) + consentement implicite (upload volontaire)
- Retention : 15 ans (dossier medical), configurable par type
- Droit a l'effacement : suppression des documents via admin avec trace audit
- Scan MRZ piece d'identite : traitement 100% cote client (navigateur), la photo ne transite pas par le serveur — principe de minimisation des donnees Art. 5.1.c RGPD

## 8. Permissions RBAC

| Permission | Description | Roles |
|---|---|---|
| `preconsultation.send` | Envoyer le lien pre-consultation | admin, secretary |
| `preconsultation.manage` | Gerer le parcours (rappel, proposer dates) | admin, secretary |
| `patient_documents.view` | Voir les documents patient | admin, secretary, physician, practitioner, nurse |
| `patient_documents.delete` | Supprimer un document | admin |
| `quotes.send` | Envoyer un devis au patient | admin, secretary |

Les permissions existantes (`appointments.*`, `quotes.*`, `patients.*`) restent inchangees.

## 9. Migrations base de donnees

### Clinic DB
- `clinic_XXX_create_preconsultation_tokens` — table `preconsultation_tokens`
- `clinic_XXX_create_patient_documents` — table `patient_documents`
- `clinic_XXX_add_preconsultation_status_to_appointments` — colonne `preconsultation_status` sur `appointments`

### Central DB
- Aucune migration necessaire

## 10. Hors scope MVP

- Notifications in-app (badge/cloche) — P2
- SMS/WhatsApp — quand Twilio sera configure
- Scan antivirus ClamAV sur les uploads — P2
- PWA / app native — pas prevu
- Paiement en ligne — pas prevu
