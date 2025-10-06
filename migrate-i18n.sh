#!/bin/bash

# Script de migration automatique de LanguageContext vers i18next
# Remplace les imports et l'utilisation de useLanguage par useTranslation

echo "🚀 Migration de LanguageContext vers i18next"
echo "============================================="

# Fichiers à traiter
files=(
  "src/components/dashboard/Dashboard.js"
  "src/components/dashboard/modules/MedicalRecordsModule.js"
  "src/components/dashboard/modules/SettingsModule.js"
  "src/components/dashboard/modules/PatientsModule.js"
  "src/components/dashboard/modules/AppointmentsModule.js"
  "src/components/modals/AppointmentFormModal.js"
  "src/components/admin/ClinicConfigModal.js"
  "src/components/admin/PractitionerManagementModal.js"
  "src/components/admin/AdminDashboard.js"
  "src/components/admin/ClinicConfigurationModule.js"
  "src/components/admin/PractitionerAvailabilityManager.js"
  "src/components/admin/SpecialtiesAdminModule.js"
  "src/components/medical/ModularMedicalRecord.js"
  "src/components/medical/modules/CardiologyModule.js"
  "src/components/medical/modules/BaseModule.js"
  "src/components/medical/modules/PediatricsModule.js"
)

count=0
for file in "${files[@]}"; do
  filepath="/var/www/medical-pro/$file"

  if [ -f "$filepath" ]; then
    echo "📝 Migration de $file"

    # Remplacer l'import de LanguageContext par useTranslation
    sed -i "s/import { useLanguage } from '.*LanguageContext';/import { useTranslation } from 'react-i18next';/g" "$filepath"
    sed -i "s/import { useLanguage } from \".*LanguageContext\";/import { useTranslation } from 'react-i18next';/g" "$filepath"

    # Remplacer l'utilisation du hook
    sed -i "s/const { t } = useLanguage();/const { t } = useTranslation();/g" "$filepath"
    sed -i "s/const { t, language } = useLanguage();/const { t, i18n } = useTranslation(); const language = i18n.language;/g" "$filepath"
    sed -i "s/const { language, t } = useLanguage();/const { t, i18n } = useTranslation(); const language = i18n.language;/g" "$filepath"

    count=$((count + 1))
  else
    echo "⚠️  Fichier introuvable: $filepath"
  fi
done

echo ""
echo "✅ Migration terminée!"
echo "📊 $count fichiers traités"
echo ""
echo "⚠️  ATTENTION: Vérifiez manuellement les fichiers suivants:"
echo "  - Les namespaces i18next (t('common.key') vs t('key', { ns: 'common' }))"
echo "  - Les interpolations ({name} → {{name}})"
echo "  - Les changements de langue (changeLanguage → i18n.changeLanguage)"
