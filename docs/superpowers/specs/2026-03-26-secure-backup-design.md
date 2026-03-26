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
| Encryption standard | AES-256, GPG asymmetric (RSA-4096) |
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
pg_dump -Fc -> temp file (permissions 600)
    |
    v
pg_restore --list (catalog verification on temp file)
    |  FAIL -> alert + abort + shred temp file
    v
gpg --encrypt --recipient backup-key (asymmetric)
    |
    v
shred temp file (secure wipe of unencrypted dump)
    |
    v
chmod 600 -> /var/backups/medicalpro/*.dump.gpg
    |
    v
sha256sum -> checksums_YYYYMMDD.sha256
    |
    v
rclone copy SFTP -> local server (additive, never deletes remote)
    |
    v
cleanup local > 30 days
    |
    v
Telegram alert (detailed report)


Local Server (weekly, Sunday 04:00)
====================================
sha256sum --check (verify checksum before any decryption)
    |  FAIL -> alert + abort
    v
gpg --decrypt (private key with passphrase, local only)
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

**Target:** GPG asymmetric (RSA-4096 key pair)

| Key | Location | Purpose |
|---|---|---|
| Public key | VPS `/root/.secrets/backup_pub.gpg` | Encrypts backups |
| Private key (passphrase-protected) | Local server + offline USB | Decrypts backups |

**The VPS cannot decrypt its own backups.** An attacker who compromises the VPS gains access to the live database (unavoidable) but cannot decrypt historical backup files. This follows ANSSI recommendations for sensitive data backups.

**Consequence:** Integrity verification on VPS uses `pg_restore --list` on the dump **before** encryption (temporary file, securely wiped after). The full restoration test runs on the local server where the private key resides.

### 3.3 Backup Script (VPS)

**File:** `/opt/scripts/backup-medicalpro.sh` (modified)

Changes to existing script:

1. **Integrity verification:** After each `pg_dump`, run `pg_restore --list` on the temp file to validate the catalog before encrypting. If verification fails, abort and alert.

2. **Asymmetric encryption:** Replace `gpg --symmetric` with `gpg --encrypt --recipient <key-id>`.

3. **Secure wipe:** After encryption, `shred -u` the unencrypted temp file. The temp file exists for a few seconds only, permissions 600, root-owned.

4. **File permissions:** `chmod 600` on every `.dump.gpg` file immediately after creation.

5. **SHA-256 checksums:** Generate `checksums_YYYYMMDD.sha256` file after all dumps complete.

6. **SFTP transfer:** After local backup completes, `rclone copy` (not `sync`) to local server. Alert on transfer failure (non-blocking; local backup is preserved).

7. **Enhanced Telegram report:** Include per-database integrity status, checksum confirmation, transfer status, and disk usage.

**Backup pipeline per database (sequential, reliable exit code checking):**

```bash
# 1. Dump to temp file (permissions 600, root only)
TEMP_DUMP=$(mktemp -p /var/backups/medicalpro .dump_XXXXXX)
chmod 600 "$TEMP_DUMP"
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U medicalpro -Fc "$DB_NAME" > "$TEMP_DUMP"

# 2. Verify catalog integrity (exit code checked explicitly)
if ! pg_restore --list "$TEMP_DUMP" > /dev/null 2>&1; then
    shred -u "$TEMP_DUMP"
    alert "Integrity check FAILED for $DB_NAME"
    exit 1
fi

# 3. Encrypt with public key
gpg --batch --encrypt --recipient "$GPG_KEY_ID" --output "$BACKUP_FILE" "$TEMP_DUMP"

# 4. Secure wipe of unencrypted temp file
shred -u "$TEMP_DUMP"

# 5. Set permissions
chmod 600 "$BACKUP_FILE"
```

**Trade-off acknowledged:** The unencrypted dump exists on disk for a few seconds (between pg_dump and shred). This is necessary for reliable integrity verification — the alternative (pipe-based `tee` with process substitution) does not guarantee reliable exit code detection. The temp file is root-owned, permissions 600, and securely wiped with `shred -u` immediately after encryption.

**Why `rclone copy` and not `rclone sync`:** `rclone sync` makes the destination identical to the source. When the VPS cleanup deletes files older than 30 days, `rclone sync` would delete those same files from the local server, destroying the 90-day off-site retention. `rclone copy` only adds new files, leaving deletion to the local server's own cleanup script.

### 3.4 Restoration Test Script (Local Server)

**File:** `/opt/scripts/backup-restore-test.sh` (on local server)

Runs weekly (Sunday 04:00) after backups have been transferred.

**Steps:**

1. Find most recent `.dump.gpg` files in the local backup directory
2. **Verify checksums:** `sha256sum --check checksums_YYYYMMDD.sha256` — abort if mismatch
3. Decrypt with private key (`gpg --decrypt`, passphrase via `gpg-agent` or `--passphrase-fd`)
4. Create temporary database `restore_test_central_YYYYMMDD`
5. `pg_restore` into temporary database
6. Run validation queries:
   - `SELECT count(*) FROM users` (central) — must be > 0
   - `SELECT count(*) FROM patients` (clinic) — must be > 0
   - `SELECT count(*) FROM appointments` (clinic) — must be > 0
   - `SELECT count(*) FROM medical_records` (clinic) — must be > 0
7. `DROP DATABASE restore_test_*` (guaranteed by `trap` on EXIT)
8. Send Telegram report with counts and duration
9. Append result to restore test log

**Safety guarantees:**
- Database name is hardcoded with `restore_test_` prefix; the script refuses to target any DB without this prefix
- `trap 'DROP DATABASE ...' EXIT` ensures cleanup even on script crash
- Runs under a dedicated PostgreSQL user with `CREATEDB` but no access to production databases
- The temporary DB is created on the local server, not on the VPS
- Checksums verified before any decryption (detects corrupted or tampered files)

### 3.5 Disaster Recovery Script (Manual)

**File:** `/opt/scripts/backup-restore.sh` (on local server, used manually in crisis)

**Restoration follows the parallel-then-swap pattern. Unencrypted data never touches the VPS disk.**

**Steps:**

1. **Choose backup** — List available `.dump.gpg` files, user selects one
2. **Verify checksum** — `sha256sum --check` before any decryption
3. **Decrypt** — `gpg --decrypt` with passphrase-protected private key
4. **Restore into parallel DB on local server** — `pg_restore` into `medicalpro_central_restored` (validation environment)
5. **Validate** — Run count queries, verify data integrity on local server
6. **Stream restore to VPS via SSH tunnel** — Pipe decrypted dump directly to `pg_restore` on the VPS over SSH. No unencrypted file is written to VPS disk:
   ```bash
   gpg --decrypt file.dump.gpg | ssh -p 2222 root@72.62.51.173 \
     "pg_restore -h localhost -U medicalpro -d medicalpro_central_restored --clean --if-exists"
   ```
7. **On VPS: stop backend and terminate connections**
   ```bash
   pm2 stop medical-pro-backend
   psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'medicalpro_central';"
   ```
8. **On VPS: snapshot current prod** — Quick `pg_dump` of the current (corrupted) production DB as safety net
9. **On VPS: swap databases** — `ALTER DATABASE ... RENAME`:
   ```
   medicalpro_central           -> medicalpro_central_old
   medicalpro_central_restored  -> medicalpro_central
   ```
10. **Restart backend** — `pm2 start medical-pro-backend`
11. **Verify** — Health check, Telegram alert
12. **Rollback if needed** — Stop backend, reverse the rename, restart

**Safety guarantees:**
- Double interactive confirmation required ("OUI JE CONFIRME LA RESTAURATION")
- Backend stopped and connections terminated **before** database rename (prevents `ALTER DATABASE RENAME` failure)
- Production DB is renamed (preserved as `_old`), never dropped
- Snapshot of current state before any swap
- Rollback possible by reversing the rename
- Unencrypted data streams over SSH, never written to VPS disk

**Estimated time:** < 10 minutes (including confirmations, connection draining), well within 30-minute RTO.

### 3.6 Off-Site Transfer (SFTP)

**Tool:** rclone with SFTP remote

**Configuration:**
- Remote: `medimaestro-backup` (SFTP)
- Host: DDNS hostname (e.g., `monserveur.duckdns.org`)
- Port: SSH port of local server
- Auth: Dedicated SSH key pair (generated on VPS, public key on local server)
- User: `backup-medimaestro` (chroot SFTP, no shell access, restricted to backup directory)
- Transfer: `rclone copy /var/backups/medicalpro/ medimaestro-backup:backups/` (additive only)

**Files transferred:** `*.dump.gpg` + `checksums_*.sha256`

**Failure handling:** Non-blocking. If SFTP fails (network, DDNS, server down), the backup is preserved locally and a distinct Telegram alert is sent. Next day's run retries automatically.

### 3.7 Retention Policy

| Location | Retention | Cleanup | Method |
|---|---|---|---|
| VPS `/var/backups/medicalpro/` | 30 days | Daily by backup script | `find -mtime +30 -delete` |
| Local server `/backups/medimaestro/` | 90 days | Weekly by cleanup script | `find -mtime +90 -delete` |

Retention periods align with:
- 30 days local: fast recovery for recent incidents
- 90 days off-site: operational audit trail, delayed discovery of data issues

**Important — scope limitation:** This retention policy covers **operational disaster recovery only**. Long-term legal archiving obligations (Ley 41/2002: 15 years for medical records, 5 years for prescriptions, 6 years for billing) are a separate requirement not addressed by this design. See DPIA action item A7 for the data retention policy roadmap.

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

| Key | Type | Location | Access | Passphrase |
|---|---|---|---|---|
| GPG public key | RSA-4096 | VPS `/root/.secrets/backup_pub.gpg` | root only (600) | N/A |
| GPG private key | RSA-4096 | Local server `/root/.secrets/backup_priv.gpg` | root only (600) | **Required** — stored in password manager, not on local server |
| GPG private key (offline copy) | RSA-4096 | USB drive, physically secured | Company administrator | Same passphrase, stored separately from USB |
| SSH key (SFTP transfer) | Ed25519 | VPS `/root/.ssh/backup_sftp_key` | root only (600) | N/A |
| SSH key public | Ed25519 | Local server `~backup-medimaestro/.ssh/authorized_keys` | backup user | N/A |

**Passphrase requirement:** The GPG private key must be exported with a strong passphrase (minimum 20 characters). The passphrase is stored in a password manager (e.g., Bitwarden, KeePass), never on the same device as the key file. The restore test script supplies the passphrase via `gpg-agent` (pre-configured on local server) or `--passphrase-fd` from a secure source.

### 4.2 Key Rotation

**Frequency:** Annual (or immediately if compromise suspected)

**Procedure:**
1. Generate new GPG key pair on secure machine (not VPS)
2. Deploy new public key to VPS
3. Re-encrypt last 30 days of backups with new key (on local server)
4. Archive old private key with passphrase (labeled with date range it covers)
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
1. The attacker has the **private key file** but **not the passphrase** (stored in password manager, not on server)
2. If passphrase is suspected compromised: revoke key, generate new pair, rotate, re-encrypt recent backups
3. **VPS unaffected:** production continues normally

## 5. RGPD Compliance Checklist

| Requirement | How Addressed |
|---|---|
| Art. 32 — Encryption of personal data | AES-256 asymmetric GPG (RSA-4096) on all backups |
| Art. 32 — Ability to restore availability | Automated restore test + documented procedure, RTO < 30 min |
| Art. 32 — Regular testing of security measures | Weekly automated restore test with logged results |
| Art. 5(1)(f) — Integrity and confidentiality | SHA-256 checksums verified before restore, file permissions 600, chroot SFTP |
| Art. 30 — Records of processing | Backup policy document, key management document |
| Art. 33/34 — Breach notification preparedness | Compromise procedure documented, key separation limits blast radius |
| Data minimization | Backups contain only database dumps, no unnecessary data |
| Storage limitation | 30-day local + 90-day off-site retention, automated cleanup |

**Scope note:** This design addresses operational disaster recovery. Long-term legal retention (Ley 41/2002 Art. 17: 15 years for medical records) is tracked under DPIA action item A7 and will be a separate implementation.

## 6. Documentation Deliverables

| Document | Path | Content |
|---|---|---|
| Backup Policy | `docs/security/BACKUP_POLICY.md` | Frequency, retention, destinations, responsibilities |
| Key Management | `docs/security/ENCRYPTION_KEY_MANAGEMENT.md` | Key inventory, rotation, compromise procedure, passphrase policy |
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
5. **Password manager** accessible for storing GPG private key passphrase

## 9. Migration Plan

1. Generate GPG asymmetric key pair (RSA-4096) with strong passphrase on secure machine
2. Deploy public key to VPS `/root/.secrets/backup_pub.gpg`
3. Store private key on local server + USB offline, passphrase in password manager
4. Update backup script (integrity check, asymmetric encryption, permissions, checksums, `rclone copy`)
5. Configure rclone SFTP remote
6. Test full cycle: backup, verify, transfer, decrypt, restore
7. Deploy restore test cron on local server
8. Write documentation (4 documents)
9. **Overlap period (30 days):** Keep old symmetric key accessible. Both old (symmetric) and new (asymmetric) backups coexist.
10. After 30 days: verify all symmetric-encrypted backups have either expired or been re-encrypted with new asymmetric key
11. Decommission old symmetric key: archive passphrase in password manager (labeled with date range), remove from VPS
