// components/dashboard/Sidebar.js
import React, { useMemo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Users, Calendar, FileText, BarChart3, Settings,
  LogOut, Heart, Shield, Package, Cpu, CalendarClock, Globe
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../auth/PermissionGuard';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../contexts/LocaleContext';
import { getActiveLocales } from '../../config/locales';
import { isPractitionerRole, canAccessAdministration } from '../../utils/userRoles';

const Sidebar = () => {
  const { user, company, subscription, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const { t } = useTranslation('nav');
  const { locale, buildUrl, flag, nativeName, formatDate, changeLocale } = useLocale();
  const [showLocaleSelector, setShowLocaleSelector] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const availableLocales = getActiveLocales();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    // Check if user had "remember me" enabled
    const shouldRememberEmail = localStorage.getItem('clinicmanager_remember_me') === 'true';
    // Call logout with the remember me preference
    logout(shouldRememberEmail);
  };

  /**
   * Menu configuration with permission requirements
   * Conforme à la matrice des droits:
   *
   * - Admin clinique: clinique + employés + consentements modèles + devis/factures + patients (admin)
   * - Secrétaire: patients (admin) + RDV + consentements (assign) + devis/factures
   * - Médecin/Praticien/Infirmier: dossier médical (si équipe soins) + RDV + consentements (consultation)
   *
   * Propriétés:
   * - permission: Permission requise (null = visible à tous)
   * - medicalOnly: Réservé aux professionnels de santé (secret médical)
   * - adminOnly: Réservé aux admins (admin, super_admin, ou rôle administratif)
   */
  const menuConfig = [
    // Accessible à tous
    { id: 'home', path: '/dashboard', icon: Home, permission: null, labelKey: 'home' },

    // Patients - Données admin (secrétaire, admin, soignants)
    { id: 'patients', path: '/patients', icon: Users, permission: 'patients.view', labelKey: 'patients' },

    // Rendez-vous (secrétaire, admin, soignants)
    { id: 'appointments', path: '/appointments', icon: Calendar, permission: 'appointments.view', labelKey: 'appointments' },

    // Planning (calendrier unifié traitements et consultations)
    { id: 'planning', path: '/planning', icon: CalendarClock, permission: 'appointments.view', labelKey: 'planning' },

    // Dossiers médicaux - SECRET MÉDICAL (médecin, praticien, infirmier uniquement)
    { id: 'medical-records', path: '/medical-records', icon: FileText, permission: 'medical_records.view', medicalOnly: true, labelKey: 'medicalRecords' },

    // Consentements patients (secrétaire assign, soignants consultation)
    { id: 'consents', path: '/consents', icon: Shield, permission: 'consents.view', labelKey: 'consents' },

    // Templates de consentements (admin clinique gestion complète, autres consultation)
    { id: 'consent-templates', path: '/consent-templates', icon: FileText, permission: 'consent_templates.view', labelKey: 'consentTemplates' },

    // Devis (secrétaire, admin, médecin peut initier)
    { id: 'quotes', path: '/quotes', icon: FileText, permission: 'quotes.view', labelKey: 'quotes' },

    // Factures (secrétaire, admin - pas les soignants sauf besoin)
    { id: 'invoices', path: '/invoices', icon: FileText, permission: 'invoices.view', labelKey: 'invoices' },

    // Catalogue (produits, traitements, services - admin, secrétaire)
    { id: 'catalog', path: '/catalog', icon: Package, permission: 'catalog.view', labelKey: 'catalog' },

    // Équipements (machines pour rendez-vous - admin, secrétaire)
    { id: 'machines', path: '/machines', icon: Cpu, permission: 'machines.view', labelKey: 'equipment' },

    // Statistiques (admin, direction)
    { id: 'analytics', path: '/analytics', icon: BarChart3, permission: 'analytics.view', labelKey: 'analytics' },

    // Administration clinique (admin, super_admin, direction, clinic_admin)
    { id: 'admin', path: '/admin', icon: Shield, permission: null, adminOnly: true, labelKey: 'admin' },

    // Paramètres personnels (tous)
    { id: 'settings', path: '/settings', icon: Settings, permission: null, labelKey: 'settings' }
  ];

  // Filter menu items based on user permissions and role
  const menuItems = useMemo(() => {
    return menuConfig
      .filter(item => {
        // Check medical-only restriction (only healthcare professionals)
        if (item.medicalOnly && !isPractitionerRole(user?.role)) {
          return false;
        }

        // Check admin-only restriction
        if (item.adminOnly && !canAccessAdministration(user)) {
          return false;
        }

        // Check specific permission
        if (item.permission && !hasPermission(item.permission)) {
          return false;
        }

        return true;
      })
      .map(item => ({
        ...item,
        path: buildUrl(item.path),
        label: t(`sidebar.${item.labelKey}`)
      }));
  }, [user, hasPermission, buildUrl, t]);

  return (
    <div className="w-64 bg-white shadow-sm border-r flex flex-col">
      {/* Logo et profil utilisateur */}
      <div className="p-6 border-b">
        <div className="flex items-center space-x-2 mb-4">
          <Heart className="h-8 w-8 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">MediMaestro</h1>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-lg font-semibold text-green-700">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">
              <span className="font-medium">{user?.role}</span> • {company?.name}
            </p>
            {subscription?.plan && (
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                subscription.plan === 'enterprise'
                  ? 'bg-purple-100 text-purple-800'
                  : subscription.plan === 'professional'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {subscription.plan === 'enterprise' ? '🏢 Enterprise' :
                 subscription.plan === 'professional' ? '💼 Professional' :
                 '🆓 Free'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Langue + Date/Heure */}
      <div className="px-6 py-3 border-b">
        <div className="flex items-center justify-between">
          {/* Sélecteur de langue */}
          <div className="relative">
            <button
              onClick={() => setShowLocaleSelector(!showLocaleSelector)}
              className="flex items-center space-x-1.5 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('common:changeLanguage', 'Changer de langue')}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{flag}</span>
            </button>

            {showLocaleSelector && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowLocaleSelector(false)}
                />
                <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
                  <div className="py-1">
                    {availableLocales.map((loc) => (
                      <button
                        key={loc.code}
                        onClick={() => {
                          changeLocale(loc.code);
                          setShowLocaleSelector(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-100 ${
                          locale === loc.code ? 'bg-green-50 text-green-700' : 'text-gray-700'
                        }`}
                      >
                        <span className="text-lg">{loc.flag}</span>
                        <span>{loc.nativeName}</span>
                        {locale === loc.code && (
                          <span className="ml-auto text-green-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Date + Heure */}
          <span className="text-xs text-gray-500">
            {formatDate(currentTime, { includeTime: false })}{' '}
            {currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-green-100 text-green-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bouton de déconnexion */}
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>{t('sidebar.logout')}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;