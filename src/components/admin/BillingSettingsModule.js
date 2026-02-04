/**
 * BillingSettingsModule — Admin billing configuration
 *
 * Sections:
 *   1. Seller info (name, SIREN, VAT, legal form, capital, RCS, address, email, phone)
 *   2. Numbering prefixes (FA/DV/AV + next number preview)
 *   3. Tax & currency defaults
 *   4. Bank details (IBAN, BIC, bank, holder)
 *   5. Conditions & legal mentions (payment delay, penalties, recovery, discount, mentions)
 *   6. E-invoicing (Factur-X profile radio)
 *
 * Pattern: follows ClinicConfigurationModule (state, toast, validation).
 * API: getBillingSettings() / updateBillingSettings() from documentsApi.
 */

import React, { useState, useEffect } from 'react';
import {
  Receipt, Building2, CreditCard, FileText,
  CheckCircle, AlertCircle, X, Save, Hash, Landmark, Scale
} from 'lucide-react';
import { getBillingSettings, updateBillingSettings, getNextNumber } from '../../api/documentsApi';
import { useTranslation } from 'react-i18next';

// ============================================================================
// Default state
// ============================================================================

const DEFAULT_SETTINGS = {
  seller: {
    name: '',
    siren: '',
    vatNumber: '',
    legalForm: '',
    capital: '',
    rcs: '',
    address: { line1: '', line2: '', postalCode: '', city: '', country: 'FR' },
    email: '',
    phone: ''
  },
  prefixes: {
    invoice: 'FA',
    quote: 'DV',
    credit_note: 'AV'
  },
  defaultTaxRate: 20,
  currency: 'EUR',
  country: 'FR',
  bank: {
    name: '',
    iban: '',
    bic: '',
    holder: ''
  },
  paymentDelay: 30,
  paymentTerms: '',
  latePaymentPenalty: '',
  recoveryCompensation: '40,00 \u20AC',
  earlyPaymentDiscount: '',
  legalMentions: '',
  facturxProfile: 'EN16931'
};

// ============================================================================
// Component
// ============================================================================

const BillingSettingsModule = () => {
  const { t } = useTranslation('admin');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [nextNumbers, setNextNumbers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Load on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await getBillingSettings();
      const data = response?.data || {};
      // Merge with defaults to ensure all keys exist
      setSettings(prev => deepMerge(DEFAULT_SETTINGS, data));

      // Load next numbers preview
      await loadNextNumbers();
    } catch (error) {
      console.error('[BillingSettings] Load error:', error);
      showNotification(t('billingSettings.messages.loadError', 'Erreur lors du chargement des paramètres'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextNumbers = async () => {
    try {
      const [inv, qt, cn] = await Promise.all([
        getNextNumber('invoice').catch(() => ({ data: { nextNumber: '—' } })),
        getNextNumber('quote').catch(() => ({ data: { nextNumber: '—' } })),
        getNextNumber('credit_note').catch(() => ({ data: { nextNumber: '—' } }))
      ]);
      setNextNumbers({
        invoice: inv?.data?.nextNumber || '—',
        quote: qt?.data?.nextNumber || '—',
        credit_note: cn?.data?.nextNumber || '—'
      });
    } catch (e) {
      // Non-critical
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateBillingSettings(settings);
      showNotification(t('billingSettings.messages.saveSuccess', 'Paramètres de facturation enregistrés'));
      await loadNextNumbers();
    } catch (error) {
      console.error('[BillingSettings] Save error:', error);
      showNotification(t('billingSettings.messages.saveError', 'Erreur lors de la sauvegarde'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Nested state update helper
  const updateField = (path, value) => {
    setSettings(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg text-white ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t('billingSettings.title', 'Paramètres de facturation')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('billingSettings.subtitle', 'Configurez les informations de facturation et de conformité e-invoicing')}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? t('billingSettings.saving', 'Enregistrement...') : t('billingSettings.save', 'Enregistrer')}</span>
        </button>
      </div>

      {/* Section 1: Seller Info */}
      <Section
        icon={Building2}
        title={t('billingSettings.sellerInfo.title', 'Informations vendeur')}
        color="blue"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('billingSettings.sellerInfo.name', 'Raison sociale')} required>
            <input type="text" value={settings.seller.name} onChange={e => updateField('seller.name', e.target.value)}
              className="input-field" placeholder="Cabinet Médical Dupont" />
          </Field>
          <Field label={t('billingSettings.sellerInfo.legalForm', 'Forme juridique')}>
            <input type="text" value={settings.seller.legalForm} onChange={e => updateField('seller.legalForm', e.target.value)}
              className="input-field" placeholder="SARL, SAS, EI..." />
          </Field>
          <Field label={t('billingSettings.sellerInfo.siren', 'SIREN')}>
            <input type="text" value={settings.seller.siren} onChange={e => updateField('seller.siren', e.target.value)}
              className="input-field" placeholder="123 456 789" maxLength={11} />
          </Field>
          <Field label={t('billingSettings.sellerInfo.vatNumber', 'N° TVA intracommunautaire')}>
            <input type="text" value={settings.seller.vatNumber} onChange={e => updateField('seller.vatNumber', e.target.value)}
              className="input-field" placeholder="FR12345678901" />
          </Field>
          <Field label={t('billingSettings.sellerInfo.capital', 'Capital social')}>
            <input type="text" value={settings.seller.capital} onChange={e => updateField('seller.capital', e.target.value)}
              className="input-field" placeholder="10 000 EUR" />
          </Field>
          <Field label={t('billingSettings.sellerInfo.rcs', 'RCS')}>
            <input type="text" value={settings.seller.rcs} onChange={e => updateField('seller.rcs', e.target.value)}
              className="input-field" placeholder="Paris B 123 456 789" />
          </Field>
        </div>

        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">{t('billingSettings.sellerInfo.address', 'Adresse')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('billingSettings.sellerInfo.line1', 'Adresse ligne 1')}>
              <input type="text" value={settings.seller.address.line1} onChange={e => updateField('seller.address.line1', e.target.value)}
                className="input-field" placeholder="123 Rue de la Santé" />
            </Field>
            <Field label={t('billingSettings.sellerInfo.line2', 'Adresse ligne 2')}>
              <input type="text" value={settings.seller.address.line2} onChange={e => updateField('seller.address.line2', e.target.value)}
                className="input-field" placeholder="Bâtiment B" />
            </Field>
            <Field label={t('billingSettings.sellerInfo.postalCode', 'Code postal')}>
              <input type="text" value={settings.seller.address.postalCode} onChange={e => updateField('seller.address.postalCode', e.target.value)}
                className="input-field" placeholder="75001" maxLength={10} />
            </Field>
            <Field label={t('billingSettings.sellerInfo.city', 'Ville')}>
              <input type="text" value={settings.seller.address.city} onChange={e => updateField('seller.address.city', e.target.value)}
                className="input-field" placeholder="Paris" />
            </Field>
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">{t('billingSettings.sellerInfo.contact', 'Contact')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('billingSettings.sellerInfo.email', 'Email')}>
              <input type="email" value={settings.seller.email} onChange={e => updateField('seller.email', e.target.value)}
                className="input-field" placeholder="contact@cabinet.fr" />
            </Field>
            <Field label={t('billingSettings.sellerInfo.phone', 'Téléphone')}>
              <input type="tel" value={settings.seller.phone} onChange={e => updateField('seller.phone', e.target.value)}
                className="input-field" placeholder="+33 1 23 45 67 89" />
            </Field>
          </div>
        </div>
      </Section>

      {/* Section 2: Numbering Prefixes */}
      <Section
        icon={Hash}
        title={t('billingSettings.prefixes.title', 'Préfixes de numérotation')}
        color="green"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Field label={t('billingSettings.prefixes.invoice', 'Préfixe factures')}>
              <input type="text" value={settings.prefixes.invoice} onChange={e => updateField('prefixes.invoice', e.target.value)}
                className="input-field" placeholder="FA" maxLength={5} />
            </Field>
            <p className="text-xs text-gray-400 mt-1">
              {t('billingSettings.prefixes.nextNumber', 'Prochain')}: <span className="font-mono">{nextNumbers.invoice || '—'}</span>
            </p>
          </div>
          <div>
            <Field label={t('billingSettings.prefixes.quote', 'Préfixe devis')}>
              <input type="text" value={settings.prefixes.quote} onChange={e => updateField('prefixes.quote', e.target.value)}
                className="input-field" placeholder="DV" maxLength={5} />
            </Field>
            <p className="text-xs text-gray-400 mt-1">
              {t('billingSettings.prefixes.nextNumber', 'Prochain')}: <span className="font-mono">{nextNumbers.quote || '—'}</span>
            </p>
          </div>
          <div>
            <Field label={t('billingSettings.prefixes.creditNote', 'Préfixe avoirs')}>
              <input type="text" value={settings.prefixes.credit_note} onChange={e => updateField('prefixes.credit_note', e.target.value)}
                className="input-field" placeholder="AV" maxLength={5} />
            </Field>
            <p className="text-xs text-gray-400 mt-1">
              {t('billingSettings.prefixes.nextNumber', 'Prochain')}: <span className="font-mono">{nextNumbers.credit_note || '—'}</span>
            </p>
          </div>
        </div>
      </Section>

      {/* Section 3: Tax & Currency Defaults */}
      <Section
        icon={Receipt}
        title={t('billingSettings.defaults.title', 'TVA et devise par défaut')}
        color="purple"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label={t('billingSettings.defaults.taxRate', 'Taux de TVA par défaut (%)')}>
            <input type="number" value={settings.defaultTaxRate} onChange={e => updateField('defaultTaxRate', parseFloat(e.target.value) || 0)}
              className="input-field" min={0} max={100} step={0.5} />
          </Field>
          <Field label={t('billingSettings.defaults.currency', 'Devise')}>
            <select value={settings.currency} onChange={e => updateField('currency', e.target.value)} className="input-field">
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - Dollar US</option>
              <option value="GBP">GBP - Livre Sterling</option>
              <option value="CHF">CHF - Franc Suisse</option>
            </select>
          </Field>
          <Field label={t('billingSettings.defaults.country', 'Pays')}>
            <select value={settings.country} onChange={e => updateField('country', e.target.value)} className="input-field">
              <option value="FR">France</option>
              <option value="BE">Belgique</option>
              <option value="CH">Suisse</option>
              <option value="LU">Luxembourg</option>
              <option value="ES">Espagne</option>
              <option value="DE">Allemagne</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Section 4: Bank Details */}
      <Section
        icon={Landmark}
        title={t('billingSettings.bank.title', 'Coordonnées bancaires')}
        color="yellow"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('billingSettings.bank.bankName', 'Banque')}>
            <input type="text" value={settings.bank.name} onChange={e => updateField('bank.name', e.target.value)}
              className="input-field" placeholder="BNP Paribas" />
          </Field>
          <Field label={t('billingSettings.bank.holder', 'Titulaire du compte')}>
            <input type="text" value={settings.bank.holder} onChange={e => updateField('bank.holder', e.target.value)}
              className="input-field" placeholder="Cabinet Médical Dupont SARL" />
          </Field>
          <Field label="IBAN">
            <input type="text" value={settings.bank.iban} onChange={e => updateField('bank.iban', e.target.value)}
              className="input-field font-mono" placeholder="FR76 1234 5678 9012 3456 7890 123" />
          </Field>
          <Field label="BIC / SWIFT">
            <input type="text" value={settings.bank.bic} onChange={e => updateField('bank.bic', e.target.value)}
              className="input-field font-mono" placeholder="BNPAFRPP" maxLength={11} />
          </Field>
        </div>
      </Section>

      {/* Section 5: Conditions & Legal Mentions */}
      <Section
        icon={Scale}
        title={t('billingSettings.conditions.title', 'Conditions et mentions légales')}
        color="red"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('billingSettings.conditions.paymentDelay', 'Délai de paiement (jours)')}>
            <input type="number" value={settings.paymentDelay} onChange={e => updateField('paymentDelay', parseInt(e.target.value) || 0)}
              className="input-field" min={0} max={365} />
          </Field>
          <Field label={t('billingSettings.conditions.paymentTerms', 'Conditions de paiement')}>
            <input type="text" value={settings.paymentTerms} onChange={e => updateField('paymentTerms', e.target.value)}
              className="input-field" placeholder="Paiement à 30 jours fin de mois" />
          </Field>
          <Field label={t('billingSettings.conditions.latePaymentPenalty', 'Pénalités de retard')}>
            <input type="text" value={settings.latePaymentPenalty} onChange={e => updateField('latePaymentPenalty', e.target.value)}
              className="input-field" placeholder="3x le taux d'intérêt légal" />
          </Field>
          <Field label={t('billingSettings.conditions.recoveryCompensation', 'Indemnité forfaitaire de recouvrement')}>
            <input type="text" value={settings.recoveryCompensation} onChange={e => updateField('recoveryCompensation', e.target.value)}
              className="input-field" placeholder="40,00 EUR" />
          </Field>
          <Field label={t('billingSettings.conditions.earlyPaymentDiscount', 'Escompte pour paiement anticipé')} className="md:col-span-2">
            <input type="text" value={settings.earlyPaymentDiscount} onChange={e => updateField('earlyPaymentDiscount', e.target.value)}
              className="input-field" placeholder="Pas d'escompte pour paiement anticipé" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={t('billingSettings.conditions.legalMentions', 'Mentions légales additionnelles')}>
            <textarea value={settings.legalMentions} onChange={e => updateField('legalMentions', e.target.value)}
              className="input-field" rows={3} placeholder="Mentions légales complémentaires à afficher sur les documents..." />
          </Field>
        </div>
      </Section>

      {/* Section 6: E-invoicing */}
      <Section
        icon={FileText}
        title={t('billingSettings.einvoicing.title', 'E-invoicing (Factur-X)')}
        color="indigo"
      >
        <p className="text-sm text-gray-500 mb-4">
          {t('billingSettings.einvoicing.description', 'Sélectionnez le profil Factur-X pour la génération de factures électroniques conformes. Le XML CII est automatiquement embarqué dans le PDF des factures et avoirs.')}
        </p>
        <div className="space-y-3">
          {[
            { value: 'MINIMUM', label: 'Minimum', desc: t('billingSettings.einvoicing.minimum', 'Données minimales (numéro, date, montants). Compatible avec les systèmes les plus simples.') },
            { value: 'BASIC', label: 'Basic', desc: t('billingSettings.einvoicing.basic', 'Informations de base avec ventilation TVA et lignes de détail.') },
            { value: 'EN16931', label: 'EN 16931 (Recommandé)', desc: t('billingSettings.einvoicing.en16931', 'Profil standard européen. Conforme à la directive 2014/55/EU. Recommandé pour la plupart des cas.') },
            { value: 'EXTENDED', label: 'Extended', desc: t('billingSettings.einvoicing.extended', 'Profil étendu avec champs supplémentaires pour des besoins spécifiques.') }
          ].map(option => (
            <label key={option.value}
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                settings.facturxProfile === option.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="facturxProfile"
                value={option.value}
                checked={settings.facturxProfile === option.value}
                onChange={e => updateField('facturxProfile', e.target.value)}
                className="mt-1 text-indigo-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Section>

      {/* Bottom save button */}
      <div className="flex justify-end pb-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? t('billingSettings.saving', 'Enregistrement...') : t('billingSettings.save', 'Enregistrer')}</span>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

const SECTION_COLORS = {
  blue: 'border-blue-200',
  green: 'border-green-200',
  purple: 'border-purple-200',
  yellow: 'border-yellow-200',
  red: 'border-red-200',
  indigo: 'border-indigo-200'
};

const ICON_COLORS = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
  indigo: 'text-indigo-600'
};

function Section({ icon: Icon, title, color = 'blue', children }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${SECTION_COLORS[color]} p-6`}>
      <div className="flex items-center space-x-2 mb-4">
        <Icon className={`h-5 w-5 ${ICON_COLORS[color]}`} />
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

// ============================================================================
// Utility
// ============================================================================

function deepMerge(defaults, overrides) {
  const result = { ...defaults };
  for (const key of Object.keys(overrides || {})) {
    if (
      overrides[key] !== null &&
      typeof overrides[key] === 'object' &&
      !Array.isArray(overrides[key]) &&
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = deepMerge(defaults[key], overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

export default BillingSettingsModule;
