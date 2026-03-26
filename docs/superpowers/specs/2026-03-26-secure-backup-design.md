# Secure Backup & Disaster Recovery — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** MediMaestro production infrastructure (VPS Hostinger + serveur local SFTP)

---

## 1. Context

MediMaestro handles medical data (patients, appointments, medical records) subject to RGPD and Spanish AEPD regulations. Current backup infrastructure performs daily encrypted dumps but lacks integrity verification, restoration testing, off-site transfer, and key management documentation.

### Current State

- **Backup script:** `/opt/scripts/backup-medicalpro.sh` runs daily at 03:00
- **Method:** `pg_dump -Fc` piped to GPG symmetric AES-256 encryption
- **Storage:** `/var/backups/medicalpro/` on VPS, 30-day retention
- **Databases:** `medicalpro_central` (~8 MB) + 1 clinic DB (~12 MB)
- **Alerts:** Telegram notifications on success/failure
- **Off-site:** rclone installed but not configured

### Gaps Identified

1. No integrity verification after backup
2. No restoration testing (backups never validated)
3. File permissions too open (644 instead of 600)
4. Symmetric encryption only (private key on VPS)
5. No off-site transfer
6. No documented restoration procedure
7. No key management documentation

## 2. Requirements

| Requirement | Target |
|---|---|
| RPO (max data loss) | 24 hours |
| RTO (max downtime) | < 30 minutes |
| Encryption standard | AES-256, GPG asymmetric |
| Integrity verification | Every backup, post-creation |
| Restoration testing | Weekly, on local server |
| Off-site storage | SFTP to local server |
| Local retention | 30 days |
| Off-site retention | 90 days |
| RGPD compliance | Encryption, key management, documentation |
| Zero production risk | Restoration never touches prod directly |

## 3. Architecture

### 3.1 Overview

```
VPS Hostinger (daily 03:00 UTC)
================================
pg_dump (pipe, never written to disk unencrypted)
    |
    v
pg_restore --list (catalog verification via pipe)
    |
    v
gpg --encrypt --recipient backup-key (asymmetric)
    |
    v
chmod 600 -> /var/backups/medicalpro/*.dump.gpg
    |
    v
sha256sum -> checksums_YYYYMMDD.sha256
    |
    v
rclone sync SFTP -> local server
    |
    v
cleanup local > 30 days
    |
    v
Telegram alert (detailed report)


Local Server (weekly, Sunday 04:00)
====================================
gpg --decrypt (private key, local only)
    |
    v
pg_restore -> temporary DB "restore_test_YYYYMMDD"
    |
    v
SELECT count(*) validations
    |
    v
DROP DATABASE restore_test_*
    |
    v
Telegram alert + update restore test log
    |
    v
cleanup remote > 90 days
```

### 3.2 Encryption: Symmetric to Asymmetric Migration

**Current:** GPG symmetric (single shared key on VPS encrypts and decrypts)

**Target:** GPG asymmetric (key pair)

| Key | Location | Purpose |
|---|---|---|
| Public key | VPS `/root/.secrets/backup_pub.gpg` | Encrypts backups |
| Private key | Local server + offline USB | Decrypts backups |

**The VPS cannot decrypt its own backups.** An attacker who compromises the VPS gains access to the live database (unavoidable) but cannot decrypt historical backup files. This follows ANSSI recommendations for sensitive data backups.

**Consequence:** Integrity verification on VPS uses `pg_restore --list` on the dump **before** encryption (via pipe, never on disk). The full restoration test runs on the local server where the private key resides.

### 3.3 Backup Script (VPS)

**File:** `/opt/scripts/backup-medicalpro.sh` (modified)

Changes to existing script:

1. **Integrity verification:** After each `pg_dump`, pipe through `pg_restore --list` to validate the catalog before encrypting. If verification fails, abort and alert.

2. **Asymmetric encryption:** Replace `gpg --symmetric` with `gpg --encrypt --recipient <key-id>`.

3. **File permissions:** `chmod 600` on every `.dump.gpg` file immediately after creation.

4. **SHA-256 checksums:** Generate `checksums_YYYYMMDD.sha256` file after all dumps complete.

5. **SFTP transfer:** After local backup completes, `rclone sync` to local server. Alert on transfer failure (non-blocking; local backup is preserved).

6. **Enhanced Telegram report:** Include per-database integrity status, checksum confirmation, transfer status, and disk usage.

Backup pipeline per database (all in-memory via pipes, zero unencrypted data on disk):

```
pg_dump -Fc | tee >(pg_restore --list > /dev/null) | gpg --encrypt --recipient <key-id> > file.dump.gpg
```

If `pg_restore --list` fails (exit code != 0), the pipeline fails, the `.dump.gpg` file is removed, and an alert is sent.

### 3.4 Restoration Test Script (Local Server)

**File:** `/opt/scripts/backup-restore-test.sh` (on local server)

Runs weekly (Sunday 04:00) after backups have been transferred.

**Steps:**

1. Find most recent `.dump.gpg` files in the local backup directory
2. Decrypt with private key (`gpg --decrypt`)
3. Create temporary database `restore_test_central_YYYYMMDD`
4. `pg_restore` into temporary database
5. Run validation queries:
   - `SELECT count(*) FROM users` (central) — must be > 0
   - `SELECT count(*) FROM patients` (clinic) — must be > 0
   - `SELECT count(*) FROM appointments` (clinic) — must be > 0
   - `SELECT count(*) FROM medical_records` (clinic) — must be > 0
6. `DROP DATABASE restore_test_*` (guaranteed by `trap` on EXIT)
7. Send Telegram report with counts and duration
8. Append result to restore test log

**Safety guarantees:**
- Database name is hardcoded with `restore_test_` prefix; the script refuses to target any DB without this prefix
- `trap 'DROP DATABASE ...' EXIT` ensures cleanup even on script crash
- Runs under a dedicated PostgreSQL user with `CREATEDB` but no access to production databases
- The temporary DB is created on the local server, not on the VPS

### 3.5 Disaster Recovery Script (Manual)

**File:** `/opt/scripts/backup-restore.sh` (on local server, used manually in crisis)

**Restoration follows the parallel-then-swap pattern:**

1. **Choose backup** — List available `.dump.gpg` files, user selects one
2. **Decrypt** — `gpg --decrypt` with private key
3. **Restore into parallel DB** — `pg_restore` into `medicalpro_central_restored` (not production)
4. **Validate** — Run count queries, verify data integrity
5. **Transfer to VPS** — `scp` the decrypted dump to VPS (via SSH), or restore directly via `pg_restore` over SSH tunnel
6. **On VPS: snapshot current prod** — Quick `pg_dump` of the current (corrupted) production DB as safety net
7. **On VPS: swap databases** — `ALTER DATABASE ... RENAME`:
   ```
   medicalpro_central           -> medicalpro_central_old
   medicalpro_central_restored  -> medicalpro_central
   ```
8. **Restart backend** — `pm2 restart medical-pro-backend`
9. **Verify** — Health check, Telegram alert
10. **Rollback if needed** — Reverse the rename

**Safety guarantees:**
- Double interactive confirmation required ("OUI JE CONFIRME LA RESTAURATION")
- Production DB is renamed (preserved), never dropped
- Snapshot of current state before any swap
- Rollback possible by reversing the rename

**Estimated time:** < 5 minutes (including confirmations), well within 30-minute RTO.

### 3.6 Off-Site Transfer (SFTP)

**Tool:** rclone with SFTP remote

**Configuration:**
- Remote: `medimaestro-backup` (SFTP)
- Host: DDNS hostname (e.g., `monserveur.duckdns.org`)
- Port: SSH port of local server
- Auth: Dedicated SSH key pair (generated on VPS, public key on local server)
- User: `backup-medimaestro` (chroot SFTP, no shell access, restricted to backup directory)
- Transfer: `rclone sync /var/backups/medicalpro/ medimaestro-backup:backups/`

**Files transferred:** `*.dump.gpg` + `checksums_*.sha256`

**Failure handling:** Non-blocking. If SFTP fails (network, DDNS, server down), the backup is preserved locally and a distinct Telegram alert is sent. Next day's run retries automatically.

### 3.7 Retention Policy

| Location | Retention | Cleanup |
|---|---|---|
| VPS `/var/backups/medicalpro/` | 30 days | Daily by backup script (`find -mtime +30 -delete`) |
| Local server `/backups/medimaestro/` | 90 days | Weekly by restore test script (`find -mtime +90 -delete`) |

Retention periods align with:
- 30 days local: fast recovery for recent incidents
- 90 days off-site: RGPD compliance, audit trail, delayed discovery of data issues

### 3.8 Alerts Summary

| Event | Frequency | Channel | Content |
|---|---|---|---|
| Backup success | Daily | Telegram | DB count, sizes, integrity status, checksum, transfer status, disk usage |
| Backup failure | On error | Telegram | Error detail, affected database, action required |
| Transfer failure | On error | Telegram | SFTP error, reminder that local backup is safe |
| Restore test success | Weekly | Telegram | DB counts, duration, validation results |
| Restore test failure | On error | Telegram | Error detail, last known good test date |

## 4. Key Management

### 4.1 Key Inventory

| Key | Type | Location | Access |
|---|---|---|---|
| GPG public key | Asymmetric (RSA-4096) | VPS `/root/.secrets/backup_pub.gpg` | root only (600) |
| GPG private key | Asymmetric (RSA-4096) | Local server `/root/.secrets/backup_priv.gpg` | root only (600) |
| GPG private key (offline copy) | Asymmetric (RSA-4096) | USB drive, physically secured | Company administrator |
| SSH key (SFTP transfer) | Ed25519 | VPS `/root/.ssh/backup_sftp_key` | root only (600) |
| SSH key public | Ed25519 | Local server `~backup-medimaestro/.ssh/authorized_keys` | backup user |

### 4.2 Key Rotation

**Frequency:** Annual (or immediately if compromise suspected)

**Procedure:**
1. Generate new GPG key pair on secure machine (not VPS)
2. Deploy new public key to VPS
3. Re-encrypt last 30 days of backups with new key (on local server)
4. Archive old private key (labeled with date range it covers)
5. Update documentation
6. Verify next backup uses new key

**Old backups** remain encrypted with their original key. The old private key is preserved offline (labeled) to allow decryption if needed.

### 4.3 Compromise Procedure

If the VPS is compromised:
1. The attacker has the **public key** only — cannot decrypt existing backups
2. The attacker has access to the **live database** — this is unavoidable regardless of backup encryption
3. **Immediate actions:** rotate all keys, change DB password, review access logs
4. **Backups are safe:** historical backups on the local server remain encrypted with a key the attacker never had

If the local server is compromised:
1. The attacker has the **private key** — can decrypt backups stored locally
2. **Immediate actions:** revoke key, generate new pair, rotate, re-encrypt recent backups
3. **VPS unaffected:** production continues normally

## 5. RGPD Compliance Checklist

| Requirement | How Addressed |
|---|---|
| Art. 32 — Encryption of personal data | AES-256 asymmetric GPG on all backups |
| Art. 32 — Ability to restore availability | Automated restore test + documented procedure, RTO < 30 min |
| Art. 32 — Regular testing of security measures | Weekly automated restore test with logged results |
| Art. 5(1)(f) — Integrity and confidentiality | SHA-256 checksums, file permissions 600, chroot SFTP |
| Art. 30 — Records of processing | Backup policy document, key management document |
| Art. 33/34 — Breach notification preparedness | Compromise procedure documented, key separation limits blast radius |
| Data minimization | Backups contain only database dumps, no unnecessary data |
| Storage limitation | 30-day local + 90-day off-site retention, automated cleanup |

## 6. Documentation Deliverables

| Document | Path | Content |
|---|---|---|
| Backup Policy | `docs/security/BACKUP_POLICY.md` | Frequency, retention, destinations, responsibilities |
| Key Management | `docs/security/ENCRYPTION_KEY_MANAGEMENT.md` | Key inventory, rotation, compromise procedure |
| Disaster Recovery | `docs/security/DISASTER_RECOVERY_PROCEDURE.md` | Step-by-step restoration guide, contacts, checklist |
| Restore Test Log | `docs/security/RESTORE_TEST_LOG.md` | Auto-updated weekly test results (audit proof) |

## 7. Scripts Deliverables

| Script | Location | Runs On |
|---|---|---|
| Enhanced backup | `/opt/scripts/backup-medicalpro.sh` | VPS, daily 03:00 cron |
| Restore test | `/opt/scripts/backup-restore-test.sh` | Local server, weekly Sunday 04:00 cron |
| Disaster recovery | `/opt/scripts/backup-restore.sh` | Local server, manual (crisis) |
| Remote cleanup | `/opt/scripts/backup-cleanup-remote.sh` | Local server, weekly with restore test |

## 8. Implementation Prerequisites

Before implementation:
1. **DDNS configured** on local server (e.g., DuckDNS)
2. **SSH port** of local server known and accessible from VPS
3. **PostgreSQL installed** on local server (for restore tests)
4. **Dedicated user** `backup-medimaestro` created on local server with chroot SFTP

## 9. Migration Plan

1. Generate GPG asymmetric key pair
2. Deploy public key to VPS
3. Store private key on local server + USB offline
4. Update backup script (integrity check, asymmetric encryption, permissions, checksums)
5. Configure rclone SFTP remote
6. Test full cycle: backup, verify, transfer, decrypt, restore
7. Deploy restore test cron on local server
8. Write documentation
9. Decommission old symmetric key (after verifying all recent backups can be decrypted with new key)
