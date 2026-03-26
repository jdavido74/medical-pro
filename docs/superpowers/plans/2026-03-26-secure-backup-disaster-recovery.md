# Secure Backup & Disaster Recovery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure MediMaestro database backups with asymmetric GPG encryption, daily integrity verification, weekly automated restore testing on a local server, off-site SFTP transfer, and full RGPD-compliant documentation.

**Architecture:** Daily `pg_dump` on VPS → integrity check → GPG asymmetric encrypt (public key only on VPS) → `rclone copy` to local server via SFTP. Weekly restore test on local server (where the private key resides) validates backups are restorable. Disaster recovery script streams restore via SSH tunnel — no unencrypted data on VPS disk.

**Tech Stack:** PostgreSQL `pg_dump`/`pg_restore`, GPG (RSA-4096), rclone (SFTP), bash, cron, Telegram Bot API

**Spec:** `docs/superpowers/specs/2026-03-26-secure-backup-design.md`

---

## Prerequisites (manual, before starting)

These must be completed by the administrator before implementation begins:

1. DDNS configured on local server (e.g., DuckDNS) — hostname known
2. SSH port of local server known and accessible from VPS
3. PostgreSQL installed on local server (version >= 14)
4. Dedicated user `backup-medimaestro` created on local server with chroot SFTP (done in Task 2)
5. Password manager accessible for storing GPG passphrase (e.g., Bitwarden, KeePass)

---

## File Map

| File | Action | Runs On | Purpose |
|---|---|---|---|
| `/opt/scripts/backup-medicalpro.sh` | Modify | VPS | Enhanced backup with integrity, asymmetric GPG, checksums, rclone |
| `/opt/scripts/backup-restore-test.sh` | Create | Local server | Weekly automated restore test |
| `/opt/scripts/backup-restore.sh` | Create | Local server | Manual disaster recovery (parallel-then-swap) |
| `/opt/scripts/backup-cleanup-remote.sh` | Create | Local server | 90-day retention cleanup |
| `/etc/cron.d/medicalpro` | Modify | VPS | Add restore-test cron comment (reference for local server setup) |
| `docs/security/BACKUP_POLICY.md` | Create | Repo | RGPD backup policy document |
| `docs/security/ENCRYPTION_KEY_MANAGEMENT.md` | Create | Repo | Key inventory, rotation, compromise procedures |
| `docs/security/DISASTER_RECOVERY_PROCEDURE.md` | Create | Repo | Step-by-step restoration guide |
| `docs/security/RESTORE_TEST_LOG.md` | Create | Repo | Template for weekly test results (auto-updated) |

---

## Task 1: Generate GPG Asymmetric Key Pair

**Context:** All subsequent tasks depend on this key pair. Generate on the local server (not VPS). The private key stays local; only the public key goes to VPS.

**Files:**
- VPS: `/root/.secrets/backup_pub.gpg` (public key)
- Local server: `/root/.secrets/backup_priv.gpg` (private key)
- USB: offline copy of private key

- [ ] **Step 1: Generate RSA-4096 key pair on local server**

```bash
# On LOCAL SERVER — generate key with strong passphrase
gpg --full-generate-key
# Choose: (1) RSA and RSA
# Keysize: 4096
# Expiration: 0 (does not expire — rotation is manual, per spec)
# Real name: MediMaestro Backup
# Email: backup@medimaestro.com
# Passphrase: [strong, minimum 20 chars — store in password manager immediately]
```

- [ ] **Step 2: Export and secure the private key**

```bash
# On LOCAL SERVER
mkdir -p /root/.secrets
gpg --export-secret-keys --armor "backup@medimaestro.com" > /root/.secrets/backup_priv.gpg
chmod 600 /root/.secrets/backup_priv.gpg

# Copy to USB for offline backup
cp /root/.secrets/backup_priv.gpg /media/usb/medimaestro-backup-private-key.gpg
```

- [ ] **Step 3: Export the public key**

```bash
# On LOCAL SERVER
gpg --export --armor "backup@medimaestro.com" > /tmp/backup_pub.gpg
```

- [ ] **Step 4: Deploy public key to VPS**

```bash
# From LOCAL SERVER, transfer to VPS
scp -P 2222 /tmp/backup_pub.gpg root@72.62.51.173:/root/.secrets/backup_pub.gpg
rm /tmp/backup_pub.gpg

# On VPS — import the public key
ssh -p 2222 root@72.62.51.173 "gpg --import /root/.secrets/backup_pub.gpg && chmod 600 /root/.secrets/backup_pub.gpg"
```

- [ ] **Step 5: Verify key is importable on VPS**

```bash
ssh -p 2222 root@72.62.51.173 "gpg --list-keys backup@medimaestro.com"
```

Expected: key listed with `rsa4096` and uid `MediMaestro Backup <backup@medimaestro.com>`

- [ ] **Step 6: Trust the key on VPS (avoid "untrusted key" warnings)**

```bash
ssh -p 2222 root@72.62.51.173 "echo -e '5\ny\n' | gpg --command-fd 0 --edit-key backup@medimaestro.com trust quit"
```

- [ ] **Step 7: Test encryption/decryption roundtrip**

```bash
# On VPS — encrypt a test file
ssh -p 2222 root@72.62.51.173 "echo 'test data' > /tmp/test.txt && gpg --batch --encrypt --recipient backup@medimaestro.com --output /tmp/test.gpg /tmp/test.txt && rm /tmp/test.txt && echo 'Encryption OK'"

# Transfer encrypted file to local server
scp -P 2222 root@72.62.51.173:/tmp/test.gpg /tmp/test.gpg

# On LOCAL SERVER — decrypt (will prompt for passphrase)
gpg --decrypt /tmp/test.gpg
# Expected output: "test data"

# Cleanup
rm /tmp/test.gpg
ssh -p 2222 root@72.62.51.173 "rm /tmp/test.gpg"
```

- [ ] **Step 8: Record passphrase in password manager**

Store in password manager with entry name: `MediMaestro Backup GPG Key — backup@medimaestro.com`
Include: passphrase, key fingerprint, generation date, key location paths.

- [ ] **Step 9: Commit (note — no code files; this is infrastructure-only)**

No git commit for this task — keys are infrastructure, not in the repo.

---

## Task 2: Set Up SFTP User and SSH Key for Off-Site Transfer

**Context:** Create a dedicated locked-down user on the local server for receiving backups. Generate an SSH key on the VPS for authentication.

- [ ] **Step 1: Create dedicated backup user on local server**

```bash
# On LOCAL SERVER
sudo useradd -m -d /home/backup-medimaestro -s /usr/sbin/nologin backup-medimaestro
sudo mkdir -p /backups/medimaestro
sudo chown backup-medimaestro:backup-medimaestro /backups/medimaestro
sudo chmod 700 /backups/medimaestro
```

- [ ] **Step 2: Configure chroot SFTP for the backup user**

```bash
# On LOCAL SERVER — append to /etc/ssh/sshd_config
cat >> /etc/ssh/sshd_config << 'EOF'

# MediMaestro backup SFTP chroot
Match User backup-medimaestro
    ChrootDirectory /backups
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
    PasswordAuthentication no
EOF

# Chroot requires parent dirs owned by root
sudo chown root:root /backups
sudo chmod 755 /backups
# The medimaestro subdir stays owned by the user
sudo chown backup-medimaestro:backup-medimaestro /backups/medimaestro

sudo systemctl restart sshd
```

- [ ] **Step 3: Generate SSH key on VPS for SFTP transfer**

```bash
# On VPS
ssh-keygen -t ed25519 -f /root/.ssh/backup_sftp_key -N "" -C "medimaestro-backup-sftp"
chmod 600 /root/.ssh/backup_sftp_key
```

- [ ] **Step 4: Deploy public key to local server**

```bash
# From VPS — transfer public key
ssh -p 2222 root@72.62.51.173 "cat /root/.ssh/backup_sftp_key.pub" | \
  ssh localserver "sudo mkdir -p /home/backup-medimaestro/.ssh && \
  sudo tee /home/backup-medimaestro/.ssh/authorized_keys > /dev/null && \
  sudo chown -R backup-medimaestro:backup-medimaestro /home/backup-medimaestro/.ssh && \
  sudo chmod 700 /home/backup-medimaestro/.ssh && \
  sudo chmod 600 /home/backup-medimaestro/.ssh/authorized_keys"
```

Note: Replace `localserver` with actual DDNS hostname and port.

- [ ] **Step 5: Verify SSH key auth works for the backup user**

```bash
# From VPS — test SSH connection as backup user (should get "This service allows sftp connections only")
ssh -p 2222 root@72.62.51.173 "ssh -i /root/.ssh/backup_sftp_key -p SSH_PORT_HERE backup-medimaestro@DDNS_HOSTNAME_HERE echo test 2>&1"
```

Expected: `This service allows sftp connections only.` (because ForceCommand internal-sftp is set). This confirms the key is accepted.

Note: The chroot home (`/backups`) and SSH home (`/home/backup-medimaestro`) are intentionally different. OpenSSH resolves `authorized_keys` from the user's real `$HOME` before applying the chroot. This is standard sshd behavior.

- [ ] **Step 6: Configure rclone on VPS (update hostnames/ports below)**

```bash
# On VPS
ssh -p 2222 root@72.62.51.173 "cat > /root/.config/rclone/rclone.conf << 'EOF'
[medimaestro-backup]
type = sftp
host = DDNS_HOSTNAME_HERE
port = SSH_PORT_HERE
user = backup-medimaestro
key_file = /root/.ssh/backup_sftp_key
shell_type = unix
EOF
chmod 600 /root/.config/rclone/rclone.conf"
```

- [ ] **Step 7: Test rclone connection**

```bash
ssh -p 2222 root@72.62.51.173 "rclone lsd medimaestro-backup:medimaestro/"
```

Expected: empty directory listing (no error).

- [ ] **Step 8: Test file transfer**

```bash
ssh -p 2222 root@72.62.51.173 "echo 'test' > /tmp/rclone-test.txt && rclone copy /tmp/rclone-test.txt medimaestro-backup:medimaestro/ && rm /tmp/rclone-test.txt && echo 'Transfer OK'"

# Verify on local server
ls -la /backups/medimaestro/rclone-test.txt
rm /backups/medimaestro/rclone-test.txt
```

---

## Task 3: Enhanced Backup Script (VPS)

**Context:** Modify the existing `/opt/scripts/backup-medicalpro.sh` to add integrity verification, asymmetric encryption, secure wipe, checksums, and rclone transfer.

**Files:**
- Modify: `/opt/scripts/backup-medicalpro.sh` (on VPS, via SSH)

- [ ] **Step 1: Back up current script**

```bash
ssh -p 2222 root@72.62.51.173 "cp /opt/scripts/backup-medicalpro.sh /opt/scripts/backup-medicalpro.sh.bak.$(date +%Y%m%d)"
```

- [ ] **Step 2: Write the enhanced backup script**

Deploy the new script to VPS. Key changes from current:
- Replace `gpg --symmetric` with `gpg --encrypt --recipient backup@medimaestro.com`
- Add `backup_single_db()` function with: mktemp → pg_dump → pg_restore --list → gpg encrypt → shred → chmod 600
- Add SHA-256 checksums generation after all dumps
- Add `rclone copy` (not sync) to `medimaestro-backup:medimaestro/`
- Add transfer failure handling (non-blocking, distinct Telegram alert)
- Fix file permissions: `chmod 600` on all `.dump.gpg`
- Enhanced Telegram report with integrity status, checksum, transfer status, disk usage

```bash
ssh -p 2222 root@72.62.51.173 "cat > /opt/scripts/backup-medicalpro.sh << 'SCRIPT_EOF'
#!/bin/bash
# =============================================================================
# MedicalPro - Production Backup Script (Secure, RGPD-compliant)
# =============================================================================
# - Dumps each PostgreSQL database to a temp file
# - Verifies integrity via pg_restore --list
# - Encrypts with GPG asymmetric (public key only on this server)
# - Securely wipes the unencrypted temp file (shred -u)
# - Generates SHA-256 checksums
# - Transfers encrypted backups to off-site server via rclone/SFTP
# - Sends detailed Telegram report
#
# Cron: 0 3 * * * root /opt/scripts/backup-medicalpro.sh
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR=\"/var/backups/medicalpro\"
RETENTION_DAYS=30
DATE=\$(date +%Y%m%d_%H%M%S)
LOG=\"/var/log/medicalpro-backup.log\"
SECRETS_DIR=\"/root/.secrets\"
GPG_RECIPIENT=\"backup@medimaestro.com\"
RCLONE_REMOTE=\"medimaestro-backup:medimaestro/\"

TELEGRAM_BOT_TOKEN_FILE=\"/root/.secrets/telegram_bot_token\"
TELEGRAM_CHAT_ID_FILE=\"/root/.secrets/telegram_chat_id\"

# Tracking
BACKUP_COUNT=0
CLINIC_COUNT=0
INTEGRITY_FAILURES=0
TOTAL_SIZE_BYTES=0
BACKUP_DETAILS=\"\"
TRANSFER_OK=false

log() {
    echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] \$1\" | tee -a \"\$LOG\"
}

send_telegram() {
    local MSG=\"\$1\"
    if [[ -f \"\$TELEGRAM_BOT_TOKEN_FILE\" && -f \"\$TELEGRAM_CHAT_ID_FILE\" ]]; then
        local TOKEN=\$(cat \"\$TELEGRAM_BOT_TOKEN_FILE\")
        local CHAT_ID=\$(cat \"\$TELEGRAM_CHAT_ID_FILE\")
        curl -s -o /dev/null -X POST \"https://api.telegram.org/bot\${TOKEN}/sendMessage\" \
            --data-urlencode \"chat_id=\${CHAT_ID}\" \
            --data-urlencode \"text=\${MSG}\" \
            --data-urlencode \"parse_mode=HTML\" 2>/dev/null &
    fi
}

error_exit() {
    log \"ERROR: \$1\"
    send_telegram \"🔴 <b>MediMaestro Backup FAILED</b>\n\n❌ \$1\n\n⚠️ Action requise\"
    exit 1
}

# Backup a single database: dump → verify → encrypt → shred
backup_single_db() {
    local DB_NAME=\"\$1\"
    local BACKUP_FILE=\"\$2\"

    # 1. Dump to temp file (permissions 600, root only)
    local TEMP_DUMP
    TEMP_DUMP=\$(mktemp -p \"\$BACKUP_DIR\" .dump_XXXXXX)
    chmod 600 \"\$TEMP_DUMP\"

    if ! PGPASSWORD=\"\$DB_PASSWORD\" pg_dump -h localhost -U medicalpro -Fc \"\$DB_NAME\" > \"\$TEMP_DUMP\" 2>/dev/null; then
        shred -u \"\$TEMP_DUMP\" 2>/dev/null || rm -f \"\$TEMP_DUMP\"
        log \"  ✗ \$DB_NAME: pg_dump failed\"
        return 1
    fi

    # 2. Verify catalog integrity
    if ! pg_restore --list \"\$TEMP_DUMP\" > /dev/null 2>&1; then
        shred -u \"\$TEMP_DUMP\" 2>/dev/null || rm -f \"\$TEMP_DUMP\"
        log \"  ✗ \$DB_NAME: integrity check FAILED\"
        ((INTEGRITY_FAILURES++))
        return 1
    fi

    # 3. Encrypt with public key (asymmetric)
    if ! gpg --batch --yes --encrypt --recipient \"\$GPG_RECIPIENT\" --output \"\$BACKUP_FILE\" \"\$TEMP_DUMP\" 2>/dev/null; then
        shred -u \"\$TEMP_DUMP\" 2>/dev/null || rm -f \"\$TEMP_DUMP\"
        log \"  ✗ \$DB_NAME: encryption failed\"
        return 1
    fi

    # 4. Secure wipe of unencrypted temp file
    shred -u \"\$TEMP_DUMP\" 2>/dev/null || rm -f \"\$TEMP_DUMP\"

    # 5. Set permissions
    chmod 600 \"\$BACKUP_FILE\"

    local FILE_SIZE
    FILE_SIZE=\$(du -h \"\$BACKUP_FILE\" | cut -f1)
    local FILE_BYTES
    FILE_BYTES=\$(stat -c%s \"\$BACKUP_FILE\")
    TOTAL_SIZE_BYTES=\$((TOTAL_SIZE_BYTES + FILE_BYTES))

    log \"  ✓ \$DB_NAME: \$FILE_SIZE (integrity OK, encrypted)\"
    BACKUP_DETAILS+=\"  • \$DB_NAME : \$FILE_SIZE ✓ intégrité OK\n\"
    ((BACKUP_COUNT++))
    return 0
}

# =============================================================================
# Main
# =============================================================================

log \"==========================================\"
log \"Starting MedicalPro secure backup...\"
log \"==========================================\"

# Check prerequisites
[[ -f \"\$SECRETS_DIR/db_password\" ]] || error_exit \"DB password file not found\"
gpg --list-keys \"\$GPG_RECIPIENT\" > /dev/null 2>&1 || error_exit \"GPG public key not found for \$GPG_RECIPIENT\"

DB_PASSWORD=\$(cat \"\$SECRETS_DIR/db_password\")
mkdir -p \"\$BACKUP_DIR\"
chmod 700 \"\$BACKUP_DIR\"

# Backup central database
log \"Backing up central database...\"
CENTRAL_BACKUP=\"\$BACKUP_DIR/central_\${DATE}.dump.gpg\"
backup_single_db \"medicalpro_central\" \"\$CENTRAL_BACKUP\" || log \"WARNING: Central backup failed\"

# Backup clinic databases
log \"Backing up clinic databases...\"
CLINIC_DBS=\$(PGPASSWORD=\"\$DB_PASSWORD\" psql -h localhost -U medicalpro -d medicalpro_central -t \
    -c \"SELECT 'medicalpro_clinic_' || REPLACE(id::text, '-', '_') FROM companies WHERE is_active = true\" 2>/dev/null || echo \"\")

if [[ -n \"\$CLINIC_DBS\" ]]; then
    while IFS= read -r db; do
        db=\$(echo \"\$db\" | xargs)
        [[ -z \"\$db\" ]] && continue
        CLINIC_BACKUP=\"\$BACKUP_DIR/\${db}_\${DATE}.dump.gpg\"
        if backup_single_db \"\$db\" \"\$CLINIC_BACKUP\"; then
            ((CLINIC_COUNT++))
        fi
    done <<< \"\$CLINIC_DBS\"
fi

log \"Clinic databases backed up: \$CLINIC_COUNT\"

# Generate SHA-256 checksums for today's backups
CHECKSUM_FILE=\"\$BACKUP_DIR/checksums_\${DATE}.sha256\"
find \"\$BACKUP_DIR\" -name \"*_\${DATE}.dump.gpg\" -exec sha256sum {} + > \"\$CHECKSUM_FILE\" 2>/dev/null
chmod 600 \"\$CHECKSUM_FILE\"
log \"Checksums generated: \$CHECKSUM_FILE\"

# Transfer to off-site server
log \"Transferring to off-site server...\"
if rclone copy \"\$BACKUP_DIR/\" \"\$RCLONE_REMOTE\" --include \"*_\${DATE}.*\" 2>/dev/null; then
    TRANSFER_OK=true
    log \"Off-site transfer completed\"
else
    log \"WARNING: Off-site transfer failed\"
    send_telegram \"⚠️ <b>MediMaestro — Transfert hors site ÉCHOUÉ</b>\n\nLe backup local est intact.\nVérifier la connexion SFTP.\"
fi

# Cleanup old backups
log \"Cleaning up backups older than \$RETENTION_DAYS days...\"
DELETED_COUNT=\$(find \"\$BACKUP_DIR\" -name \"*.dump.gpg\" -mtime +\$RETENTION_DAYS -delete -print 2>/dev/null | wc -l)
find \"\$BACKUP_DIR\" -name \"checksums_*.sha256\" -mtime +\$RETENTION_DAYS -delete 2>/dev/null
log \"Deleted \$DELETED_COUNT old backup files\"

# Fix permissions on any old files that might have wrong perms
find \"\$BACKUP_DIR\" -name \"*.dump.gpg\" ! -perm 600 -exec chmod 600 {} +

# Summary
TOTAL_SIZE=\$(du -sh \"\$BACKUP_DIR\" | cut -f1)
DISK_AVAIL=\$(df -h /var/backups | awk 'NR==2{print \$4}')
TRANSFER_STATUS=\$( [[ \"\$TRANSFER_OK\" == true ]] && echo \"✓ transféré\" || echo \"⚠️ ÉCHOUÉ\" )

log \"==========================================\"
log \"Backup completed: \$BACKUP_COUNT backups, \$INTEGRITY_FAILURES integrity failures\"
log \"==========================================\"

if [[ \$INTEGRITY_FAILURES -gt 0 ]]; then
    send_telegram \"🟡 <b>MediMaestro Backup — \$(date +%d/%m/%Y)</b>\n\n📦 Backups : \$BACKUP_COUNT\n\$BACKUP_DETAILS\n⚠️ Échecs intégrité : \$INTEGRITY_FAILURES\n\n🔒 Chiffrement : GPG asymétrique AES-256\n🔑 Checksums SHA-256 générés\n📤 Hors site : \$TRANSFER_STATUS\n🗑️ Nettoyage : \$DELETED_COUNT fichiers supprimés\n💾 Espace : \$TOTAL_SIZE / \$DISK_AVAIL disponibles\"
else
    send_telegram \"✅ <b>MediMaestro Backup — \$(date +%d/%m/%Y)</b>\n\n📦 Backups : \$BACKUP_COUNT\n\$BACKUP_DETAILS\n🔒 Chiffrement : GPG asymétrique AES-256\n🔑 Checksums SHA-256 générés\n📤 Hors site : \$TRANSFER_STATUS\n🗑️ Nettoyage : \$DELETED_COUNT fichiers supprimés\n💾 Espace : \$TOTAL_SIZE / \$DISK_AVAIL disponibles\"
fi

exit 0
SCRIPT_EOF
chmod 700 /opt/scripts/backup-medicalpro.sh"
```

- [ ] **Step 3: Test the enhanced script manually**

```bash
ssh -p 2222 root@72.62.51.173 "/opt/scripts/backup-medicalpro.sh"
```

Verify:
- Telegram message received with integrity OK for each DB
- Files in `/var/backups/medicalpro/` have permissions 600
- `checksums_*.sha256` file exists
- No `.dump_*` temp files left behind
- Off-site transfer status (OK or expected failure if SFTP not yet configured)

- [ ] **Step 4: Verify encrypted file cannot be decrypted on VPS**

```bash
ssh -p 2222 root@72.62.51.173 "gpg --decrypt /var/backups/medicalpro/central_*.dump.gpg 2>&1 | head -3"
```

Expected: `gpg: decryption failed: No secret key` — confirms VPS cannot decrypt its own backups.

- [ ] **Step 5: Commit backup script to backend repo for reference**

```bash
cd /var/www/medical-pro-backend
mkdir -p scripts/production
# Capture the actual deployed script from VPS
scp -P 2222 root@72.62.51.173:/opt/scripts/backup-medicalpro.sh scripts/production/backup-medicalpro.sh.reference
git add scripts/production/backup-medicalpro.sh.reference
git commit -m "docs: add reference copy of production backup script"
```

---

## Task 4: Restore Test Script (Local Server)

**Context:** Weekly automated restore test. Runs on local server where the private key resides. Creates temp DB, validates data, drops DB, reports via Telegram.

**Files:**
- Create: `/opt/scripts/backup-restore-test.sh` (on local server)

- [ ] **Step 1: Write the restore test script**

Deploy to local server. The script:
- Finds the most recent backup files
- Verifies SHA-256 checksums before decryption
- Decrypts with GPG private key (passphrase via gpg-agent)
- Restores into `restore_test_*` temporary database
- Validates with count queries (users, patients, appointments, medical_records)
- Drops temporary DB (guaranteed by `trap`)
- Sends Telegram report
- Appends to restore test log

```bash
# On LOCAL SERVER
cat > /opt/scripts/backup-restore-test.sh << 'SCRIPT_EOF'
#!/bin/bash
# =============================================================================
# MediMaestro - Automated Restore Test (runs on local server)
# =============================================================================
# Validates backups by restoring into temporary databases.
# Private key MUST be on this machine. Never runs on VPS.
#
# Cron: 0 4 * * 0 root /opt/scripts/backup-restore-test.sh
# =============================================================================

set -euo pipefail

BACKUP_DIR="/backups/medimaestro"
DATE=$(date +%Y%m%d)
LOG="/var/log/medimaestro-restore-test.log"
RESTORE_LOG="/var/log/medimaestro-restore-test-results.md"
DB_USER="restore_tester"
DB_HOST="localhost"

TELEGRAM_BOT_TOKEN_FILE="/root/.secrets/telegram_bot_token"
TELEGRAM_CHAT_ID_FILE="/root/.secrets/telegram_chat_id"

# Track created DBs for cleanup
CREATED_DBS=()

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

send_telegram() {
    local MSG="$1"
    if [[ -f "$TELEGRAM_BOT_TOKEN_FILE" && -f "$TELEGRAM_CHAT_ID_FILE" ]]; then
        local TOKEN=$(cat "$TELEGRAM_BOT_TOKEN_FILE")
        local CHAT_ID=$(cat "$TELEGRAM_CHAT_ID_FILE")
        curl -s -o /dev/null -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
            --data-urlencode "chat_id=${CHAT_ID}" \
            --data-urlencode "text=${MSG}" \
            --data-urlencode "parse_mode=HTML" 2>/dev/null &
    fi
}

cleanup() {
    log "Cleaning up temporary databases..."
    for db in "${CREATED_DBS[@]}"; do
        if [[ "$db" == restore_test_* ]]; then
            psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$db\";" 2>/dev/null
            log "  Dropped: $db"
        fi
    done
}
trap cleanup EXIT

# Validate a single backup file
test_restore() {
    local GPG_FILE="$1"
    local DB_PREFIX="$2"
    local EXPECTED_TABLE="$3"

    local TEST_DB="restore_test_${DB_PREFIX}_${DATE}"

    # Safety: refuse non-restore_test_ names
    if [[ "$TEST_DB" != restore_test_* ]]; then
        log "SAFETY: Refused to create DB without restore_test_ prefix: $TEST_DB"
        return 1
    fi

    CREATED_DBS+=("$TEST_DB")

    # Create temporary database
    psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$TEST_DB\";" 2>/dev/null || {
        log "  ✗ Failed to create $TEST_DB"
        return 1
    }

    # Decrypt and restore via pipe (no unencrypted file on disk)
    if ! gpg --batch --decrypt "$GPG_FILE" 2>/dev/null | pg_restore -h "$DB_HOST" -U "$DB_USER" -d "$TEST_DB" --no-owner --no-acl 2>/dev/null; then
        log "  ✗ Restore failed for $TEST_DB"
        return 1
    fi

    # Validate: count rows in expected table
    local COUNT
    COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$TEST_DB" -t -c "SELECT count(*) FROM $EXPECTED_TABLE;" 2>/dev/null | xargs)

    if [[ -z "$COUNT" || "$COUNT" -le 0 ]]; then
        log "  ✗ Validation failed: $EXPECTED_TABLE has $COUNT rows"
        return 1
    fi

    log "  ✓ $TEST_DB: $EXPECTED_TABLE=$COUNT rows"
    echo "$COUNT"
    return 0
}

# =============================================================================
# Main
# =============================================================================

START_TIME=$(date +%s)
log "=========================================="
log "Starting restore test..."
log "=========================================="

RESULTS=""
ALL_OK=true

# Find most recent checksum file
LATEST_CHECKSUM=$(ls -t "$BACKUP_DIR"/checksums_*.sha256 2>/dev/null | head -1)

if [[ -z "$LATEST_CHECKSUM" ]]; then
    log "ERROR: No checksum file found"
    send_telegram "🔴 <b>Test de restauration ÉCHOUÉ</b>\n\nAucun fichier checksum trouvé dans $BACKUP_DIR"
    exit 1
fi

# Verify checksums
log "Verifying checksums..."
if ! (cd "$BACKUP_DIR" && sha256sum --check "$LATEST_CHECKSUM" 2>/dev/null); then
    log "ERROR: Checksum verification failed"
    send_telegram "🔴 <b>Test de restauration ÉCHOUÉ</b>\n\n❌ Vérification des checksums échouée\nFichiers potentiellement corrompus ou altérés"
    exit 1
fi

# Find most recent central backup
CENTRAL_FILE=$(ls -t "$BACKUP_DIR"/central_*.dump.gpg 2>/dev/null | head -1)
if [[ -n "$CENTRAL_FILE" ]]; then
    log "Testing central database restore..."
    USERS_COUNT=$(test_restore "$CENTRAL_FILE" "central" "users" || echo "FAIL")
    if [[ "$USERS_COUNT" == "FAIL" ]]; then
        ALL_OK=false
        RESULTS+="❌ Central : échec\n"
    else
        RESULTS+="✅ Central : Users=$USERS_COUNT\n"
    fi
fi

# Find most recent clinic backup — validate all required tables
CLINIC_FILE=$(ls -t "$BACKUP_DIR"/medicalpro_clinic_*.dump.gpg 2>/dev/null | head -1)
if [[ -n "$CLINIC_FILE" ]]; then
    log "Testing clinic database restore..."

    # Restore once, validate multiple tables
    CLINIC_TEST_DB="restore_test_clinic_${DATE}"
    CREATED_DBS+=("$CLINIC_TEST_DB")

    # Safety check
    if [[ "$CLINIC_TEST_DB" != restore_test_* ]]; then
        log "SAFETY: Refused to create DB without restore_test_ prefix"
    else
        psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$CLINIC_TEST_DB\";" 2>/dev/null
        gpg --batch --decrypt "$CLINIC_FILE" 2>/dev/null | pg_restore -h "$DB_HOST" -U "$DB_USER" -d "$CLINIC_TEST_DB" --no-owner --no-acl 2>/dev/null

        CLINIC_OK=true
        CLINIC_DETAIL=""
        for TABLE in patients appointments medical_records; do
            COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$CLINIC_TEST_DB" -t -c "SELECT count(*) FROM $TABLE;" 2>/dev/null | xargs)
            if [[ -z "$COUNT" || "$COUNT" -le 0 ]]; then
                CLINIC_OK=false
                CLINIC_DETAIL+="$TABLE=FAIL "
            else
                CLINIC_DETAIL+="$TABLE=$COUNT "
            fi
        done

        if [[ "$CLINIC_OK" == true ]]; then
            RESULTS+="✅ Clinique : $CLINIC_DETAIL\n"
            log "  ✓ Clinic: $CLINIC_DETAIL"
        else
            ALL_OK=false
            RESULTS+="❌ Clinique : $CLINIC_DETAIL\n"
            log "  ✗ Clinic validation failed: $CLINIC_DETAIL"
        fi
    fi
fi

# Duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Cleanup old off-site backups (> 90 days)
REMOTE_DELETED=$(find "$BACKUP_DIR" -name "*.dump.gpg" -mtime +90 -delete -print 2>/dev/null | wc -l)
find "$BACKUP_DIR" -name "checksums_*.sha256" -mtime +90 -delete 2>/dev/null
log "Remote cleanup: $REMOTE_DELETED files deleted (> 90 days)"

# Append to restore test log
echo "| $(date +%Y-%m-%d) | $( [[ "$ALL_OK" == true ]] && echo "OK" || echo "FAIL" ) | ${DURATION}s | $(echo -e "$RESULTS" | tr '\n' ' ') |" >> "$RESTORE_LOG"

# Telegram report
if [[ "$ALL_OK" == true ]]; then
    send_telegram "🧪 <b>Test de restauration — $(date +%d/%m/%Y)</b>\n\n$RESULTS\n🧹 Nettoyage : $REMOTE_DELETED fichiers > 90j supprimés\n⏱️ Durée : ${DURATION}s"
else
    send_telegram "🔴 <b>Test de restauration ÉCHOUÉ — $(date +%d/%m/%Y)</b>\n\n$RESULTS\n⏱️ Durée : ${DURATION}s\n\n⚠️ Action requise"
fi

log "Restore test completed in ${DURATION}s"
exit 0
SCRIPT_EOF
chmod 700 /opt/scripts/backup-restore-test.sh
```

- [ ] **Step 2: Create the restore_tester PostgreSQL role on local server**

```bash
# On LOCAL SERVER
sudo -u postgres psql -c "CREATE ROLE restore_tester WITH LOGIN CREATEDB PASSWORD 'GENERATE_STRONG_PASSWORD';"
```

- [ ] **Step 3: Transfer a recent backup to local server and test**

```bash
# Copy a backup manually if rclone not yet working
scp -P 2222 root@72.62.51.173:/var/backups/medicalpro/central_*.dump.gpg /backups/medimaestro/
scp -P 2222 root@72.62.51.173:/var/backups/medicalpro/checksums_*.sha256 /backups/medimaestro/
scp -P 2222 root@72.62.51.173:/var/backups/medicalpro/medicalpro_clinic_*.dump.gpg /backups/medimaestro/

# Run the test
/opt/scripts/backup-restore-test.sh
```

Verify: Telegram report received, no `restore_test_*` databases left behind.

- [ ] **Step 4: Set up cron on local server**

```bash
# On LOCAL SERVER
echo '0 4 * * 0 root /opt/scripts/backup-restore-test.sh >> /var/log/medimaestro-restore-test.log 2>&1' > /etc/cron.d/medimaestro-restore-test
chmod 644 /etc/cron.d/medimaestro-restore-test
```

---

## Task 5: Disaster Recovery Script (Local Server)

**Context:** Manual script for real crisis situations. Parallel-then-swap pattern. Interactive confirmations. Streams restore via SSH tunnel — no unencrypted data on VPS disk.

**Files:**
- Create: `/opt/scripts/backup-restore.sh` (on local server)

- [ ] **Step 1: Write the disaster recovery script**

Deploy to local server. The script:
- Lists available backups, user selects one
- Verifies checksum
- Decrypts and validates locally first
- Streams restore to VPS via SSH tunnel (no unencrypted data on VPS disk)
- Stops PM2, terminates connections, snapshots current prod, swaps DBs, restarts
- Double interactive confirmation
- Rollback instructions printed at end

```bash
# On LOCAL SERVER
cat > /opt/scripts/backup-restore.sh << 'SCRIPT_EOF'
#!/bin/bash
# =============================================================================
# MediMaestro - Disaster Recovery (manual, interactive)
# =============================================================================
# Run this on the LOCAL SERVER in a crisis situation.
# Restores a backup to production via SSH tunnel.
# No unencrypted data is written to VPS disk.
# =============================================================================

set -euo pipefail

BACKUP_DIR="/backups/medimaestro"
VPS_HOST="72.62.51.173"
VPS_PORT="2222"
VPS_USER="root"
DB_USER="medicalpro"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}"
echo "=============================================="
echo "  MEDIMAESTRO — RESTAURATION D'URGENCE"
echo "=============================================="
echo -e "${NC}"
echo ""

# Step 1: List available backups
echo "Backups disponibles :"
echo ""
select BACKUP_FILE in $(ls -t "$BACKUP_DIR"/*.dump.gpg 2>/dev/null); do
    [[ -n "$BACKUP_FILE" ]] && break
    echo "Sélection invalide."
done

echo ""
echo -e "Fichier sélectionné : ${GREEN}$BACKUP_FILE${NC}"

# Determine target database from filename
if [[ "$BACKUP_FILE" == *central* ]]; then
    TARGET_DB="medicalpro_central"
elif [[ "$BACKUP_FILE" == *clinic* ]]; then
    TARGET_DB=$(basename "$BACKUP_FILE" | sed 's/_[0-9]\{8\}_.*//')
else
    echo "Impossible de déterminer la base cible depuis le nom du fichier."
    exit 1
fi

RESTORED_DB="${TARGET_DB}_restored"

echo -e "Base cible : ${YELLOW}$TARGET_DB${NC}"
echo -e "Base intermédiaire : ${GREEN}$RESTORED_DB${NC}"
echo ""

# Step 2: Verify checksum
echo "Vérification du checksum..."
CHECKSUM_FILE=$(ls -t "$BACKUP_DIR"/checksums_*.sha256 2>/dev/null | head -1)
if [[ -n "$CHECKSUM_FILE" ]]; then
    if (cd "$BACKUP_DIR" && sha256sum --check "$CHECKSUM_FILE" --ignore-missing 2>/dev/null | grep -q "$(basename "$BACKUP_FILE")"); then
        echo -e "${GREEN}✓ Checksum vérifié${NC}"
    else
        echo -e "${YELLOW}⚠️  Checksum non trouvé pour ce fichier (backup ancien ?)${NC}"
        read -p "Continuer malgré tout ? (oui/non) : " CONTINUE
        [[ "$CONTINUE" != "oui" ]] && exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Aucun fichier checksum trouvé${NC}"
fi

# Step 3: First confirmation
echo ""
echo -e "${RED}⚠️  RESTAURATION DE BASE DE DONNÉES EN PRODUCTION${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Fichier source : $(basename "$BACKUP_FILE")"
echo "  Base cible     : $TARGET_DB"
echo "  Méthode        : Stream SSH (aucune donnée non chiffrée sur le VPS)"
echo ""
echo "  Un snapshot de la base actuelle sera créé avant basculement."
echo ""
read -p 'Tapez "OUI JE CONFIRME LA RESTAURATION" pour continuer : ' CONFIRM
if [[ "$CONFIRM" != "OUI JE CONFIRME LA RESTAURATION" ]]; then
    echo "Restauration annulée."
    exit 0
fi

echo ""
echo "Étape 1/6 : Restauration locale pour validation..."
# Create local validation DB
sudo -u postgres psql -c "DROP DATABASE IF EXISTS \"${RESTORED_DB}\";" 2>/dev/null
sudo -u postgres psql -c "CREATE DATABASE \"${RESTORED_DB}\";" 2>/dev/null
gpg --batch --decrypt "$BACKUP_FILE" 2>/dev/null | pg_restore -h localhost -U postgres -d "$RESTORED_DB" --no-owner --no-acl 2>/dev/null
echo -e "${GREEN}✓ Restauration locale OK${NC}"

echo "Étape 2/6 : Validation des données..."
# Basic validation
if [[ "$TARGET_DB" == *central* ]]; then
    COUNT=$(psql -h localhost -U postgres -d "$RESTORED_DB" -t -c "SELECT count(*) FROM users;" | xargs)
    echo "  Users : $COUNT"
else
    COUNT=$(psql -h localhost -U postgres -d "$RESTORED_DB" -t -c "SELECT count(*) FROM patients;" | xargs)
    echo "  Patients : $COUNT"
fi
[[ "$COUNT" -le 0 ]] && echo -e "${RED}✗ Base vide — restauration annulée${NC}" && exit 1
echo -e "${GREEN}✓ Validation OK${NC}"

echo "Étape 3/6 : Stream vers le VPS..."
# Create restored DB on VPS and stream restore
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "PGPASSWORD=\$(cat /root/.secrets/db_password) psql -h localhost -U $DB_USER -d postgres -c 'DROP DATABASE IF EXISTS \"${RESTORED_DB}\";' && PGPASSWORD=\$(cat /root/.secrets/db_password) psql -h localhost -U $DB_USER -d postgres -c 'CREATE DATABASE \"${RESTORED_DB}\";'"
gpg --batch --decrypt "$BACKUP_FILE" 2>/dev/null | ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "PGPASSWORD=\$(cat /root/.secrets/db_password) pg_restore -h localhost -U $DB_USER -d ${RESTORED_DB} --no-owner --no-acl" 2>/dev/null
echo -e "${GREEN}✓ Stream vers VPS terminé${NC}"

# Second confirmation before swap
echo ""
read -p "Données restaurées sur le VPS. Basculer maintenant ? (oui/non) : " SWAP_CONFIRM
[[ "$SWAP_CONFIRM" != "oui" ]] && echo "Basculement annulé. La base ${RESTORED_DB} reste disponible sur le VPS." && exit 0

echo "Étape 4/6 : Arrêt du backend et snapshot..."
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "pm2 stop medical-pro-backend 2>/dev/null; PGPASSWORD=\$(cat /root/.secrets/db_password) psql -h localhost -U $DB_USER -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB}';\" 2>/dev/null"

# Snapshot current prod (encrypted — no unencrypted data on VPS disk)
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "PGPASSWORD=\$(cat /root/.secrets/db_password) pg_dump -h localhost -U $DB_USER -Fc ${TARGET_DB} | gpg --batch --yes --encrypt --recipient backup@medimaestro.com --output /var/backups/medicalpro/pre_restore_snapshot_\$(date +%Y%m%d_%H%M%S).dump.gpg 2>/dev/null && chmod 600 /var/backups/medicalpro/pre_restore_snapshot_*.dump.gpg && echo 'Snapshot OK (encrypted)'"

echo "Étape 5/6 : Basculement des bases..."
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "PGPASSWORD=\$(cat /root/.secrets/db_password) psql -h localhost -U $DB_USER -d postgres << SQL
ALTER DATABASE \"${TARGET_DB}\" RENAME TO \"${TARGET_DB}_old\";
ALTER DATABASE \"${RESTORED_DB}\" RENAME TO \"${TARGET_DB}\";
SQL"
echo -e "${GREEN}✓ Basculement effectué${NC}"

echo "Étape 6/6 : Redémarrage du backend..."
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "pm2 start medical-pro-backend 2>/dev/null"
echo -e "${GREEN}✓ Backend redémarré${NC}"

# Cleanup local validation DB
sudo -u postgres psql -c "DROP DATABASE IF EXISTS \"${RESTORED_DB}\";" 2>/dev/null

echo ""
echo -e "${GREEN}=============================================="
echo "  RESTAURATION TERMINÉE AVEC SUCCÈS"
echo "==============================================${NC}"
echo ""
echo "Rollback si nécessaire :"
echo "  ssh -p $VPS_PORT $VPS_USER@$VPS_HOST"
echo "  pm2 stop medical-pro-backend"
echo "  psql -d postgres -c \"ALTER DATABASE \\\"${TARGET_DB}\\\" RENAME TO \\\"${RESTORED_DB}\\\";\""
echo "  psql -d postgres -c \"ALTER DATABASE \\\"${TARGET_DB}_old\\\" RENAME TO \\\"${TARGET_DB}\\\";\""
echo "  pm2 start medical-pro-backend"
echo ""

SCRIPT_EOF
chmod 700 /opt/scripts/backup-restore.sh
```

- [ ] **Step 2: Dry-run test (without actual swap)**

Test the script up to the first confirmation, then cancel. Verify the flow is clear and the backup list displays correctly.

---

## Task 6: RGPD Documentation

**Context:** Four documents required by the spec. Committed to the backend repo under `docs/security/`.

**Files:**
- Create: `docs/security/BACKUP_POLICY.md`
- Create: `docs/security/ENCRYPTION_KEY_MANAGEMENT.md`
- Create: `docs/security/DISASTER_RECOVERY_PROCEDURE.md`
- Create: `docs/security/RESTORE_TEST_LOG.md`

- [ ] **Step 1: Write BACKUP_POLICY.md**

Content: frequency (daily 03:00 UTC), method (pg_dump -Fc), encryption (GPG asymmetric RSA-4096 AES-256), integrity (pg_restore --list + SHA-256), retention (30 days local, 90 days off-site), destinations (VPS local, SFTP to local server), responsibilities (automated, admin monitors Telegram alerts), scope limitation (operational DR only, not long-term legal archiving per Ley 41/2002).

- [ ] **Step 2: Write ENCRYPTION_KEY_MANAGEMENT.md**

Content: key inventory table (from spec section 4.1), passphrase policy (20+ chars, password manager only), rotation procedure (annual, from spec 4.2), compromise procedure (VPS compromise vs local server compromise, from spec 4.3), key generation instructions.

- [ ] **Step 3: Write DISASTER_RECOVERY_PROCEDURE.md**

Content: prerequisites checklist (access to local server, GPG passphrase, SSH to VPS), step-by-step guide (from spec section 3.5, all 12 steps), rollback procedure, contacts, estimated timeline (< 10 min), post-restoration checklist (health check, verify data, notify team).

- [ ] **Step 4: Write RESTORE_TEST_LOG.md**

Content: markdown table template with columns: Date, Result (OK/FAIL), Duration, Central Users, Clinic Patients, Clinic Appointments, Notes. First row: placeholder for first automated test.

- [ ] **Step 5: Commit documentation**

```bash
cd /var/www/medical-pro-backend
git add docs/security/BACKUP_POLICY.md docs/security/ENCRYPTION_KEY_MANAGEMENT.md docs/security/DISASTER_RECOVERY_PROCEDURE.md docs/security/RESTORE_TEST_LOG.md
git commit -m "docs(security): add RGPD backup policy, key management, DR procedure, and restore test log"
```

---

## Task 7: Migration — Symmetric to Asymmetric Overlap Period

**Context:** The VPS currently uses a symmetric key. After deploying the new script (Task 3), new backups use asymmetric encryption. Old symmetric backups remain for up to 30 days. This task documents the overlap and decommission.

- [ ] **Step 1: Archive old symmetric key passphrase**

Store in password manager with entry: `MediMaestro OLD Symmetric Backup Key — DECOMMISSIONED [date range: 2026-02 to 2026-03]`

- [ ] **Step 2: Verify first asymmetric backup works end-to-end**

After Task 3 runs (next 03:00 cron), verify:
- New `.dump.gpg` file created
- Cannot be decrypted on VPS (`gpg: No secret key`)
- Can be decrypted on local server
- Checksum matches

- [ ] **Step 3: Set calendar reminder for decommission (30 days)**

After 30 days, all symmetric-encrypted backups will have expired (30-day retention). At that point:
- Verify no symmetric `.dump.gpg` files remain
- Remove `/root/.secrets/backup_key` from VPS
- Update documentation to note decommission date

- [ ] **Step 4: Update MEMORY.md**

Add entry noting the migration date, overlap period end date, and decommission status.

---

## Task 8: End-to-End Validation

**Context:** Full cycle test to confirm everything works together.

- [ ] **Step 1: Trigger a manual backup on VPS**

```bash
ssh -p 2222 root@72.62.51.173 "/opt/scripts/backup-medicalpro.sh"
```

- [ ] **Step 2: Verify Telegram alert with full details**

Check: integrity OK per DB, checksums, transfer status, disk usage.

- [ ] **Step 3: Verify files transferred to local server**

```bash
ls -la /backups/medimaestro/*.dump.gpg
ls -la /backups/medimaestro/checksums_*.sha256
```

- [ ] **Step 4: Run restore test on local server**

```bash
/opt/scripts/backup-restore-test.sh
```

Check: Telegram report with counts, no restore_test_ DBs left behind.

- [ ] **Step 5: Verify file permissions across both servers**

```bash
# VPS
ssh -p 2222 root@72.62.51.173 "stat -c '%a %U %G %n' /var/backups/medicalpro/*.dump.gpg | tail -3"
# Expected: 600 root root for each file

# Local server
stat -c '%a %U %G %n' /backups/medimaestro/*.dump.gpg | tail -3
```

- [ ] **Step 6: Final commit — update compliance audit score**

Update `docs/security/COMPLIANCE_AUDIT_2026-02-26.md` to reflect completed backup improvements (sections 2.3 Chiffrement, 6. Conservation & archivage).

```bash
cd /var/www/medical-pro-backend
git add docs/security/COMPLIANCE_AUDIT_2026-02-26.md
git commit -m "docs(security): update compliance audit with backup improvements"
```
