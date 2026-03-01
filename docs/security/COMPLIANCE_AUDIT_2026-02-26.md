# Audit de Compliance MEDIMaestro - SaaS Santé

**Date** : 26 février 2026
**Scope** : Frontend (`medical-pro`) + Backend (`medical-pro-backend`) + Infrastructure (VPS Hostinger)
**Référentiel** : Checklist certification SaaS santé (RGPD, AEPD, ISO 27001)
**Score global** : **25/49 (~51%)** *(mis à jour 2026-03-01, était 21/49)*
**Score technique MVP** : **23/26 (88%)**

> **Note** : L'écart entre les deux scores s'explique par le fait que la base technique est solide, mais la couche documentaire/procédurale (obligatoire pour certification) est largement absente.

---

## Vue d'ensemble

| Catégorie | Statut | Score |
|-----------|--------|-------|
| 2.1 Hébergement | Partiel | 2/5 |
| 2.2 Sécurité applicative | Solide | 7/8 |
| 2.3 Chiffrement | Partiel | 2/4 |
| 2.4 Logs & traçabilité | Solide | 5/5 *(+2, auditd + PG logging + logwatch)* |
| 3.1 Secure SDLC | Faible | 1/4 |
| 3.2 Gestion accès internes | Solide | 4/4 *(+2, auditd SSH, comptes désactivés, PasswordAuth corrigé)* |
| 4.1 Data breach | Absent | 0/4 |
| 5.1 Droits des patients | Partiel | 2/4 |
| 6. Conservation & archivage | Faible | 1/4 |
| 7. Documentation obligatoire | Faible | 1/7 |

---

## 2.1 HÉBERGEMENT

| Exigence | Statut | Détail |
|----------|--------|--------|
| Hébergement UE uniquement | NON VERIFIE | Hostinger VPS — DC en Europe probable mais pas de garantie contractuelle UE-only |
| Data center ISO 27001 | NON VERIFIE | Aucun certificat ISO 27001 du datacenter dans la documentation |
| Data processing agreement (DPA) | NON | Pas de DPA documenté avec Hostinger |
| Sauvegardes chiffrées hors site | PARTIEL | Backups GPG AES-256 locaux (30j rétention), rclone configuré mais non connecté |
| Plan de reprise (PRA) | PARTIEL | Script `restore-medicalpro.sh` existe, mais PRA non formalisé (RTO/RPO non définis) |
| Plan de continuité (PCA) | NON | Aucun PCA documenté |

### Actions requises

1. Vérifier/obtenir la certification ISO 27001 du datacenter Hostinger
2. Signer un DPA avec Hostinger (ou migrer vers cloud certifié ISO 27001+27701 : OVHcloud, Scaleway)
3. Finaliser la config rclone pour backup hors site
4. Rédiger PRA formel (définir RTO/RPO) et PCA

---

## 2.2 SÉCURITÉ APPLICATIVE

### Authentification

| Exigence | Statut | Détail |
|----------|--------|--------|
| Hashing bcrypt/argon2 | OUI | bcrypt cost 12, timing-safe comparison (`src/models/User.js`) |
| MFA pour comptes admin | PARTIEL | Backend TOTP implémenté (AES-256-GCM, backup codes SHA-256), UI frontend non implémentée, super_admin non activé |
| Timeout session | OUI | Access token JWT 2h, refresh token 7j en httpOnly cookie SameSite:strict |
| Protection brute force | OUI | Rate limiting multi-couche : login 1req/s (nginx), password reset 5/15min/IP, 2FA 5/15min/IP, API global 100/15min |

### Autorisations

| Exigence | Statut | Détail |
|----------|--------|--------|
| RBAC strict | OUI | 8 rôles, 50+ permissions granulaires, source of truth en DB (`clinic_roles`), middleware `requirePermission()` |
| Isolation tenant | OUI | Base de données séparée par clinique (`medicalpro_clinic_<UUID>`), validation membership à chaque requête |
| Vérification côté backend | OUI | Permissions revalidées contre la DB centrale (jamais trustées du JWT), détection tampering JWT (rôle + companyId) |

### Détail technique

- **Rôles** : super_admin, admin, responsable, physician, practitioner, nurse, secretary, readonly
- **Token architecture** : Access token en mémoire JS (pas localStorage), refresh token en httpOnly cookie
- **Tampering detection** : Comparaison JWT role/companyId vs DB à chaque requête, log + rejet si divergence
- **Rate limiting nginx** : API 10req/s burst 20, login 1req/s burst 5
- **Rate limiting backend** : express-rate-limit + rate-limiter-flexible

### Actions requises

1. Implémenter l'UI 2FA frontend (setup wizard + QR code + saisie TOTP au login)
2. Activer le TOTP pour le compte super_admin (josedavid.orts@gmail.com)

---

## 2.3 CHIFFREMENT

| Exigence | Statut | Détail |
|----------|--------|--------|
| TLS 1.2 minimum | OUI | TLS 1.2+1.3, Let's Encrypt, HSTS preload (31536000s), ciphers ECDHE forts |
| Données chiffrées au repos | NON VERIFIE | Pas de LUKS/disk encryption documenté sur le VPS |
| Champs sensibles chiffrés en base | PARTIEL | TOTP = AES-256-GCM, passwords = bcrypt, **PII (nom, email, tel) = non chiffré**, **dossiers médicaux = non chiffré** |
| Rotation des clés | NON | Pas de politique de rotation (JWT_SECRET, DB_PASSWORD, TOTP_ENCRYPTION_KEY) |

### Détail technique

- **Certificats SSL** : Let's Encrypt, principal + wildcard, renouvellement auto 1er du mois à 4h
- **Headers** : HSTS preload + includeSubDomains, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, CSP strict, Permissions-Policy restrictive
- **Secrets** : Stockés dans `/root/.secrets/` (permissions 600), validation au démarrage (fail-fast)
- **Framework encryption frontend** : `dataEncryption.js` Phase 1 (marquage) prêt, Phase 2 (AES-256-GCM via API) non implémenté

### Actions requises

1. Vérifier si Hostinger offre le disk encryption (ou implémenter LUKS)
2. Implémenter le chiffrement des champs PII en base (Phase 2 de dataEncryption)
3. Documenter et planifier la rotation des clés (trimestrielle recommandée)

---

## 2.4 LOGS & TRAÇABILITÉ

| Exigence | Statut | Détail |
|----------|--------|--------|
| Log d'accès patient | OUI | `auditService` avec 30+ event types (PATIENT_VIEW, PATIENT_EDIT, etc.), IP + User-Agent |
| Log modification dossier médical | OUI | Events MEDICAL_RECORD_CREATE/EDIT/DELETE avec before/after changes |
| Log export de données | OUI | Event PATIENT_EXPORT défini, export audit CSV disponible (`/audit/export`) |
| Conservation logs >= 2 ans | NON | Aucune politique de rétention — logs s'accumulent sans limite ni purge |
| Impossibilité de suppression par utilisateur | PARTIEL | INSERT direct SQL (pas ORM), mais pas de protection DB-level |
| **Audit système (auditd)** | **OUI** *(ajouté 2026-03-01)* | **27 règles : SSH, .env, secrets, nginx, cron, PostgreSQL, privilege escalation, file deletion** |
| **Logging connexions DB** | **OUI** *(ajouté 2026-03-01)* | **`log_connections` + `log_disconnections` activés dans PostgreSQL** |
| **Rapports quotidiens** | **OUI** *(ajouté 2026-03-01)* | **logwatch rapport quotidien à 7h UTC via Telegram + fichier `/var/log/logwatch/`** |

### Détail technique

- **Table** : `audit_logs` (DB centrale, par company)
- **Champs** : user_id, company_id, event_type, resource_type, resource_id, action, changes, ip_address, user_agent, success, error_message, timestamp
- **Immutabilité** : Insert via SQL brut (contourne ORM), mais DELETE/UPDATE non bloqués au niveau PostgreSQL
- **Events** : LOGIN, USER_*, PATIENT_*, MEDICAL_*, INVOICE_*, CONSENT_*, PERMISSION_*, TOKEN_TAMPER
- **UI Admin** : Module AuditManagement avec recherche, filtres, pagination, export CSV/JSON, détection activité suspecte

### Actions requises

1. Définir politique de rétention (minimum 2 ans pour logs santé en Espagne)
2. Protéger `audit_logs` au niveau DB : `REVOKE DELETE, UPDATE ON audit_logs FROM medicalpro;`
3. Configurer archivage automatique (ou envoi vers stockage externe ELK/S3)

---

## 3. SÉCURITÉ DEVOPS

### 3.1 Secure SDLC

| Exigence | Statut | Détail |
|----------|--------|--------|
| Revue de code sécurité | INFORMEL | Audit manuel 14/02/2026 (64 vulnérabilités corrigées), pas de processus systématique |
| Scan vulnérabilités dépendances | NON | Pas de npm audit / Snyk / Dependabot dans le CI/CD |
| Tests OWASP Top 10 | OUI | Cahier de tests sécurité MVP (23/26, 88%), injection SQL/XSS/CSRF couverts |
| Test d'intrusion annuel | NON | Audit interne effectué, pas de pentest externe indépendant |

### 3.2 Gestion des accès internes

| Exigence | Statut | Détail |
|----------|--------|--------|
| Accès prod limité | OUI | User `deploy` sudo limité (PM2 only), SSH key-only, port 2222, MaxAuthTries 3 |
| Pas d'accès base en clair | PARTIEL | DB localhost-only, mais root a accès direct psql |
| Logs d'accès développeurs | **OUI** *(corrigé 2026-03-01)* | **auditd 27 règles : SSH, privilege escalation, accès .env, file deletion** |
| Révocation immédiate si départ | NON | Pas de procédure documentée |
| **Password auth SSH désactivé** | **OUI** *(corrigé 2026-03-01)* | **Faille détectée et corrigée : `PasswordAuthentication yes` était actif malgré config, fixed via `00-medicalpro.conf`** |
| **Comptes inactifs désactivés** | **OUI** *(ajouté 2026-03-01)* | **`ubuntu` et `adminpro` → `/usr/sbin/nologin`** |

### Actions requises

1. Ajouter `npm audit --audit-level=high` dans les workflows CI/CD (ou Snyk/Dependabot)
2. Planifier pentest externe annuel
3. ~~Implémenter logging SSH (auditd ou équivalent)~~ **FAIT 2026-03-01**
4. Documenter la procédure de révocation d'accès (SSH keys, GitHub, secrets)

---

## 4. GESTION DES INCIDENTS (DATA BREACH)

| Exigence | Statut | Détail |
|----------|--------|--------|
| Procédure interne écrite | NON | Aucun document d'incident response |
| Délai 72h notification AEPD | NON | Pas de procédure de notification documentée |
| Template notification patient | NON | Pas de template |
| Journal des incidents | NON | Pas de registre des incidents |

### Actions requises (PRIORITAIRE)

1. Rédiger la politique de gestion des incidents (détection, classification, escalation, communication)
2. Créer le template de notification AEPD (72h) et patient
3. Mettre en place un registre des incidents (même si vide)
4. Définir les rôles : DPO, responsable technique, contact AEPD

---

## 5. DROITS DES PATIENTS

| Exigence | Statut | Détail |
|----------|--------|--------|
| Export dossier patient (portabilité) | NON | Pas d'endpoint d'export patient RGPD (seul l'export audit existe) |
| Suppression si légalement possible | PARTIEL | Soft delete (archived/deleted_at), pas de hard delete ni purge automatique |
| Historique accès | OUI | Audit log complet avec IP, User-Agent, timestamp pour chaque accès patient |
| Consentement explicite enregistré | OUI | Module Consents : templates, signature électronique, statuts (pending/signed/revoked), device info RGPD |

### Détail technique consentement

- **Table** : `consents` avec paranoid soft delete
- **Statuts** : draft, pending, signed, revoked
- **Signature** : Canvas (dessin), timestamp, IP, User-Agent capturés
- **Page publique** : `/public/consent/:token` (pas d'auth requise, sécurité par token)
- **Audit** : Events CONSENT_SIGNED, CONSENT_REVOKED loggés

### Actions requises

1. Implémenter endpoint `/patients/:id/export` (export JSON/PDF du dossier complet)
2. Ajouter bouton export dans l'UI frontend (PatientDetailModal)
3. Implémenter hard delete après durée légale de conservation

---

## 6. CONSERVATION & ARCHIVAGE

| Exigence | Statut | Détail |
|----------|--------|--------|
| Politique de rétention définie | NON | Aucune politique écrite |
| Archivage sécurisé | OUI | Backups GPG AES-256, permissions 700, cron quotidien 3h |
| Suppression automatique après durée légale | NON | Pas de purge automatique des données applicatives |
| Sauvegardes purgées aussi | PARTIEL | Backups purgés après 30j (find -mtime +30 -delete), non aligné sur durée légale |

### Références légales Espagne

- **Dossiers médicaux** : Conservation minimum 5 ans après dernier contact (Ley 41/2002), certaines CCAA exigent 10-20 ans
- **Audit logs santé** : Minimum 2 ans
- **Données comptables** : 6 ans (Code de Commerce)
- **Consentements** : Durée du traitement + durée légale post-révocation

### Actions requises

1. Rédiger la politique de rétention avec durées légales
2. Implémenter purge automatique post-durée légale (cron + script)
3. Aligner la rétention backups sur la politique

---

## 7. DOCUMENTATION OBLIGATOIRE

| Document | Statut | Détail |
|----------|--------|--------|
| Politique de sécurité | PARTIEL | `SECURITY.md` existe (technique), pas de politique formelle de sécurité de l'information |
| Politique gestion incidents | NON | Inexistant |
| Politique contrôle d'accès | NON | RBAC implémenté, pas de politique formelle |
| Registre des traitements (Art. 30) | NON | Inexistant (obligatoire RGPD) |
| DPIA | NON | Inexistant (obligatoire pour données de santé) |
| Contrats sous-traitants (DPA) | NON | Pas de DPA avec Hostinger, GitHub, Let's Encrypt |
| NDA internes | NON | Non documenté |

### Actions requises

Chaque document doit être rédigé formellement. Suggestion de priorité :

1. **DPIA** (obligatoire, données de santé = traitement à risque élevé)
2. **Registre des traitements** (obligatoire Art. 30 RGPD)
3. **Politique gestion incidents** (obligatoire, délai 72h AEPD)
4. **DPA sous-traitants** (Hostinger en priorité)
5. **Politique de sécurité** (formaliser le SECURITY.md existant)
6. **Politique contrôle d'accès** (documenter le RBAC existant)
7. **NDA internes** (si équipe > 1 personne)

---

## CE QUI EST DÉJÀ SOLIDE (acquis techniques)

| Domaine | Implémentation |
|---------|---------------|
| Isolation multi-tenant | Base de données séparée par clinique, validation membership systématique |
| RBAC granulaire | 50+ permissions, 8 rôles, vérification backend systématique, détection tampering |
| Protection injections | SQL (Sequelize paramétré), XSS (DOMPurify + sanitize middleware), Shell (env vars) |
| Tokens sécurisés | httpOnly cookies, in-memory access token, SameSite strict, CSRF-safe |
| Audit trail | 30+ event types, IP/UA tracking, immutabilité applicative, export CSV |
| Consentement électronique | Signature, révocation, traçabilité complète |
| Headers de sécurité | CSP strict, HSTS preload, X-Frame-Options, Permissions-Policy |
| Infrastructure réseau | Firewall UFW strict (3 ports), SSH hardened (port 2222, key-only, MaxAuthTries 3, PasswordAuth off) |
| **fail2ban** *(ajouté 2026-03-01)* | **7 jails : sshd, nginx-bad-request, nginx-botsearch, nginx-http-auth, nginx-exploit (custom), nginx-badbots (custom), recidive** |
| **Audit système** *(ajouté 2026-03-01)* | **auditd 27 règles immutables : SSH, .env, secrets, nginx, fail2ban, cron, PG, systemd, sysctl, SSL, privilege escalation, file deletion** |
| **Hardening OS** *(ajouté 2026-03-01)* | **server_tokens off, send_redirects=0, Node bind localhost, .env chmod 600, comptes inactifs nologin** |
| Backups chiffrés | GPG AES-256, script automatisé quotidien, restore script |
| Monitoring | Health check 5min, alertes Telegram, pm2-logrotate, **logwatch rapport quotidien** |
| Séparation env | .env.development / .env.production, guard CI/CD anti-localhost |

---

## PLAN D'ACTION PAR PRIORITÉ

### CRITIQUE (immédiat)

| # | Action | Effort estimé | Impact compliance |
|---|--------|---------------|-------------------|
| 1 | Procédure gestion incidents + notification AEPD 72h | 2-3 jours | +4 points |
| 2 | DPIA (obligatoire données de santé) | 3-5 jours | +1 point |
| 3 | Registre des traitements (Art. 30 RGPD) | 2 jours | +1 point |
| 4 | DPA avec Hostinger | 1 jour | +1 point |
| 5 | UI 2FA frontend + activation super_admin | 2-3 jours dev | +1 point |

### HAUTE PRIORITÉ (30 jours)

| # | Action | Effort estimé | Impact compliance |
|---|--------|---------------|-------------------|
| 6 | npm audit dans CI/CD | 0.5 jour | +1 point |
| 7 | Politique de rétention des données | 1-2 jours | +1 point |
| 8 | Export patient RGPD (portabilité) | 2-3 jours dev | +1 point |
| 9 | Backup hors site (rclone) | 0.5 jour | +1 point |
| 10 | Protection DB audit_logs (REVOKE DELETE) | 0.5 jour | +1 point |

### MOYENNE PRIORITÉ (60 jours)

| # | Action | Effort estimé | Impact compliance |
|---|--------|---------------|-------------------|
| 11 | Politiques formelles (sécurité, contrôle accès) | 3-5 jours | +2 points |
| 12 | Disk encryption (LUKS ou équivalent) | 1 jour | +1 point |
| 13 | Chiffrement PII en base (Phase 2) | 5-10 jours dev | +1 point |
| 14 | Procédure révocation accès | 1 jour | +1 point |
| ~~15~~ | ~~Logging sessions SSH (auditd)~~ | ~~1 jour~~ | ~~+1 point~~ **FAIT 2026-03-01** |
| 16 | Pentest externe | Variable | +1 point |
| 17 | NDA internes | 1 jour | +1 point |

### Score projeté après actions critiques + haute priorité : ~37/49 (~76%)
### Score projeté après toutes les actions : ~46/49 (~94%)

---

## ADDENDUM : HARDENING INFRASTRUCTURE (2026-03-01)

Suite à l'analyse de pics de trafic suspects, un audit et hardening complet de l'infrastructure a été réalisé le 1er mars 2026.

### Contexte

Analyse d'un pic de trafic entrant à ~06:35 CET sur le VPS de production. L'investigation via `sysstat` (sar), logs Nginx et journald a révélé :
- **Pic identifié** : `apt-daily.service` téléchargement listes de paquets (~16 kB/s, 20s) — légitime
- **Bots détectés** : Nmap (`45.248.37.186`), probes SMB/EternalBlue (`35.203.210.25`), CensysInspect, curl scanners
- **Trafic baseline** : ~0.25 kB/s rx, 0.06 kB/s tx — serveur quasi inactif hors heures d'utilisation

### Corrections appliquées

#### 1. fail2ban — 7 jails (était 1)

| Jail | Filtre | Ban | Maxretry | Cible |
|------|--------|-----|----------|-------|
| sshd | built-in | 2h | 3 | Brute-force SSH |
| nginx-bad-request | built-in | 1h | 3 | Requêtes 400 (SMB probes, SSL garbage) |
| nginx-botsearch | built-in | 1h | 3 | 404 sur chemins exploit connus |
| nginx-http-auth | built-in | 1h | 3 | Echecs authentification HTTP |
| **nginx-exploit** | **custom** | **24h** | **1** | Path traversal, cgi-bin, .env, HNAP1, wp-admin, phpmyadmin, payloads binaires |
| **nginx-badbots** | **custom** | **24h** | **1** | Nmap, masscan, nikto, sqlmap, gobuster, wpscan, Nuclei, zgrab, etc. |
| **recidive** | built-in | **1 semaine** | 3 | IPs bannies 3+ fois toutes jails confondues |

**Fichiers** :
- `/etc/fail2ban/jail.local` — Configuration principale
- `/etc/fail2ban/filter.d/nginx-exploit.conf` — Filtre custom exploits
- `/etc/fail2ban/filter.d/nginx-badbots.conf` — Filtre custom bots malveillants

**Note technique** : Chaque jail Nginx utilise `backend = auto` explicitement car `defaults-debian.conf` impose `backend = systemd` qui ignore les `logpath`.

#### 2. SSH — Faille PasswordAuthentication corrigée

**Problème découvert** : `sshd -T` montrait `passwordauthentication yes` malgré `medicalpro.conf` qui le désactivait.

**Cause** : OpenSSH applique "first match wins". Le fichier `50-cloud-init.conf` (`PasswordAuthentication yes`) était lu avant `medicalpro.conf` (tri alphabétique).

**Corrections** :
- Renommé `medicalpro.conf` → `00-medicalpro.conf` (lu en premier)
- `50-cloud-init.conf` neutralisé (contenu vidé)
- Cloud-init SSH override désactivé (`/etc/cloud/cloud.cfg.d/99-disable-ssh-override.cfg`)
- Base `sshd_config` nettoyée (`PermitRootLogin yes` et `X11Forwarding yes` commentés)

**Config SSH effective vérifiée** :
```
passwordauthentication no
permitrootlogin without-password
pubkeyauthentication yes
maxauthtries 3
x11forwarding no
allowtcpforwarding no
port 2222
```

#### 3. auditd — 27 règles de surveillance

| Catégorie | Fichiers/Syscalls surveillés | Clé |
|-----------|------------------------------|-----|
| SSH & Auth | sshd_config, sshd_config.d/, pam.d/, auth.log | `ssh_config`, `pam_config`, `auth_log_access` |
| Comptes | /etc/passwd, shadow, group, sudoers | `user_accounts`, `group_accounts`, `sudoers` |
| Application | .env (backend + admin), /root/.secrets/ | `app_env_access`, `secrets_access` |
| Infrastructure | nginx, fail2ban, cron, PostgreSQL, systemd, sysctl, letsencrypt | `nginx_config`, `fail2ban_config`, `cron_changes`, etc. |
| Syscalls | Escalade de privilèges (execve euid=0), suppression fichiers, changement hostname | `privilege_escalation`, `file_deletion`, `hostname_change` |
| Backups | /var/backups/medicalpro/ | `backup_access` |

**Fichier** : `/etc/audit/rules.d/medicalpro.rules`
**Mode** : Immutable (`-e 2`) — reboot requis pour modifier les règles

#### 4. logwatch — Rapports quotidiens

- Rapport à 7h00 UTC (8h00 CET) via Telegram + fichier log
- Script : `/opt/scripts/logwatch-report.sh`
- Rapport complet : `/var/log/logwatch/daily-report.log`
- Analyse : SSH, nginx, fail2ban, cron, kernel, pam, PostgreSQL, etc.

#### 5. Hardening divers

| Correction | Avant | Après |
|------------|-------|-------|
| Nginx `server_tokens` | `nginx/1.24.0 (Ubuntu)` exposé | `nginx` (version masquée) |
| Admin `.env` permissions | `-rw-rw-r--` (world-readable) | `-rw-------` (owner only) |
| Kernel `send_redirects` | `1` (actif) | `0` (persistant `/etc/sysctl.d/99-medicalpro-hardening.conf`) |
| Frontend bind | `*:3000` (toutes interfaces) | `127.0.0.1:3000` (localhost uniquement) |
| PostgreSQL logging | Connexions non tracées | `log_connections` + `log_disconnections` activés |
| Comptes inactifs | `ubuntu`/`adminpro` avec bash shell | `/usr/sbin/nologin` |

### Ports ouverts (vérifié 2026-03-01)

**UFW** (default: deny incoming, allow outgoing) :
| Port | Service | Exposé |
|------|---------|--------|
| 80/tcp | Nginx HTTP (redirect HTTPS) | Oui |
| 443/tcp | Nginx HTTPS | Oui |
| 2222/tcp | SSH | Oui |

**Ports internes** (non accessibles depuis Internet) :
| Port | Service | Bind |
|------|---------|------|
| 3000 | Frontend (serve) | 127.0.0.1 |
| 3001 | Backend API (PM2) | 0.0.0.0 *(à corriger → 127.0.0.1)* |
| 5432 | PostgreSQL | 127.0.0.1 |

### Actions restantes

| Priorité | Action |
|----------|--------|
| Moyenne | Backend bind `127.0.0.1:3001` — modifier `server.js` via CI/CD |
| Moyenne | Retirer 2ème clé SSH WSL de `/root/.ssh/authorized_keys` |

---

## ANNEXE : FICHIERS CLÉS AUDITÉS

### Backend (`/var/www/medical-pro-backend`)

| Fichier | Rôle sécurité |
|---------|---------------|
| `src/middleware/auth.js` | Auth JWT, validation membership, détection tampering |
| `src/middleware/permissions.js` | RBAC, requirePermission(), clinic_roles |
| `src/middleware/clinicRouting.js` | Isolation tenant, routing DB |
| `src/middleware/sanitize.js` | Sanitisation input (stripHtml global) |
| `src/services/auditService.js` | Audit logging (30+ events, SQL direct) |
| `src/services/totpService.js` | TOTP 2FA (AES-256-GCM, backup codes) |
| `src/models/User.js` | bcrypt hash, beforeCreate/beforeUpdate hooks |
| `src/routes/auth.js` | Login, refresh, password reset, rate limiting |
| `src/routes/totp.js` | Setup/verify/disable 2FA |
| `src/routes/audit.js` | Consultation et export audit logs |
| `src/routes/consents.js` | Gestion consentements |
| `src/config/validateEnv.js` | Validation secrets au démarrage |
| `server.js` | Helmet, CORS, rate limiter global, CSP |
| `docs/SECURITY.md` | Documentation sécurité technique |
| `docs/PRODUCTION_SERVER_SETUP.md` | Documentation infrastructure |
| `scripts/production/nginx-multitenant.conf` | Template nginx (TLS, headers, rate limiting) |

### Frontend (`/var/www/medical-pro`)

| Fichier | Rôle sécurité |
|---------|---------------|
| `src/contexts/SecureAuthContext.js` | Auth state, in-memory tokens, refresh flow |
| `src/api/baseClient.js` | Requêtes API, injection Bearer, credentials include |
| `src/components/auth/PermissionGuard.js` | Guards composants par permission |
| `src/components/routing/PermissionRoute.js` | Guards routes par permission |
| `src/utils/security/dataEncryption.js` | Framework encryption (Phase 1 marquage) |
| `src/utils/security/secureDataAccess.js` | Accès données avec permission + audit |
| `src/utils/sanitize.js` | DOMPurify (XSS prevention) |
| `src/services/auditLogService.js` | Service envoi événements audit |
| `src/components/admin/AuditManagementModule.js` | UI consultation audit logs |
| `src/pages/public/ConsentSigningPage.js` | Signature consentement publique |
| `.env.development` / `.env.production` | Séparation environnements |

### Infrastructure (`/etc/` - serveur production)

| Fichier | Rôle sécurité |
|---------|---------------|
| `/etc/ssh/sshd_config.d/00-medicalpro.conf` | SSH hardening (key-only, port 2222, MaxAuthTries 3, no X11, no TCP forwarding) |
| `/etc/fail2ban/jail.local` | 7 jails fail2ban (sshd + 5 nginx + recidive) |
| `/etc/fail2ban/filter.d/nginx-exploit.conf` | Filtre custom : path traversal, exploit paths, payloads binaires |
| `/etc/fail2ban/filter.d/nginx-badbots.conf` | Filtre custom : Nmap, masscan, nikto, sqlmap, etc. |
| `/etc/audit/rules.d/medicalpro.rules` | 27 règles auditd (SSH, .env, secrets, infra, privilege escalation) |
| `/etc/sysctl.d/99-medicalpro-hardening.conf` | Kernel hardening (send_redirects=0) |
| `/etc/cloud/cloud.cfg.d/99-disable-ssh-override.cfg` | Empêche cloud-init de réécrire la config SSH |
| `/opt/scripts/health-check.sh` | Health check toutes les 5 min + alerte Telegram |
| `/opt/scripts/backup-medicalpro.sh` | Backup GPG quotidien à 3h + notification Telegram |
| `/opt/scripts/logwatch-report.sh` | Rapport logwatch quotidien à 7h UTC via Telegram |
| `/etc/cron.d/medicalpro` | Crons centralisés (backup, health, logwatch, certbot) |
