/**
 * Configuration centrale des routes de l'application
 * Définit la structure de navigation avec support des locales
 *
 * Structure:
 * - / -> Redirect vers /:locale/dashboard (détection auto)
 * - /:locale/* -> Routes avec contexte locale
 * - /public/* -> Routes publiques (consent signing, etc.)
 * - Legacy routes -> Redirect vers locale-prefixed
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

// Layouts
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';

// Pages publiques
import HomePage from '../components/public/HomePage';
import LoginPage from '../components/auth/LoginPage';
import SignupPage from '../components/auth/SignupPage';
import EmailVerificationPage from '../components/auth/EmailVerificationPage';
import EmailVerificationCallback from '../components/auth/EmailVerificationCallback';
import ClinicProvisioningPage from '../components/auth/ClinicProvisioningPage';
import SetPasswordPage from '../components/auth/SetPasswordPage';
import ConsentSigningPage from '../pages/public/ConsentSigningPage';

// Modules Dashboard
import HomeModule from '../components/dashboard/modules/HomeModule';
import PatientsModule from '../components/dashboard/modules/PatientsModule';
import MedicalRecordsModule from '../components/dashboard/modules/MedicalRecordsModule';
import AppointmentsModule from '../components/dashboard/modules/AppointmentsModule';
import QuotesModule from '../components/dashboard/modules/QuotesModule';
import InvoicesModule from '../components/dashboard/modules/InvoicesModule';
import ConsentManagementModule from '../components/dashboard/modules/ConsentManagementModule';
import ConsentTemplatesModule from '../components/dashboard/modules/ConsentTemplatesModule';
import CatalogModule from '../components/dashboard/modules/CatalogModule';
import SettingsModule from '../components/dashboard/modules/SettingsModule';

// Modules Admin
import UserManagementModule from '../components/admin/UserManagementModule';
import RoleManagementModule from '../components/admin/RoleManagementModule';
import TeamManagementModule from '../components/admin/TeamManagementModule';
import AuditManagementModule from '../components/admin/AuditManagementModule';
import ClinicConfigurationModule from '../components/admin/ClinicConfigurationModule';

// Admin Pages
import AdminOverview from '../pages/admin/AdminOverview';

// Composants de protection
import ProtectedRoute from '../components/routing/ProtectedRoute';
import PublicRoute from '../components/routing/PublicRoute';
import AdminRoute from '../components/routing/AdminRoute';
import PermissionRoute from '../components/routing/PermissionRoute';
import OnboardingGuard from '../components/routing/OnboardingGuard';

// Onboarding
import OnboardingWizard from '../components/onboarding/OnboardingWizard';

// Locale components
import LocaleRedirect, { LegacyRouteRedirect } from '../components/routing/LocaleRedirect';
import LocaleGuard from '../components/routing/LocaleGuard';

/**
 * Routes protégées du dashboard (réutilisables)
 * Chaque route peut avoir des restrictions de permissions:
 * - permission: Permission requise pour accéder
 * - medicalOnly: Réservé aux professionnels de santé (secret médical)
 */
const dashboardRoutes = [
  // Dashboard principal - accessible à tous les utilisateurs authentifiés
  { path: 'dashboard', element: <HomeModule /> },
  { path: 'home', element: <Navigate to="../dashboard" replace /> },

  // Patients - nécessite la permission patients.view
  {
    path: 'patients',
    element: (
      <PermissionRoute permission="patients.view">
        <PatientsModule />
      </PermissionRoute>
    )
  },
  {
    path: 'patients/:id',
    element: (
      <PermissionRoute permission="patients.view">
        <PatientsModule />
      </PermissionRoute>
    )
  },

  // Dossiers médicaux - SECRET MÉDICAL: réservé aux professionnels de santé
  {
    path: 'medical-records',
    element: (
      <PermissionRoute permission="medical_records.view" medicalOnly>
        <MedicalRecordsModule />
      </PermissionRoute>
    )
  },
  {
    path: 'medical-records/:patientId',
    element: (
      <PermissionRoute permission="medical_records.view" medicalOnly>
        <MedicalRecordsModule />
      </PermissionRoute>
    )
  },

  // Rendez-vous - nécessite la permission appointments.view
  {
    path: 'appointments',
    element: (
      <PermissionRoute permission="appointments.view">
        <AppointmentsModule />
      </PermissionRoute>
    )
  },
  {
    path: 'appointments/new',
    element: (
      <PermissionRoute permission="appointments.create">
        <AppointmentsModule />
      </PermissionRoute>
    )
  },
  {
    path: 'appointments/:id',
    element: (
      <PermissionRoute permission="appointments.view">
        <AppointmentsModule />
      </PermissionRoute>
    )
  },

  // Devis - nécessite la permission quotes.view
  {
    path: 'quotes',
    element: (
      <PermissionRoute permission="quotes.view">
        <QuotesModule />
      </PermissionRoute>
    )
  },
  {
    path: 'quotes/new',
    element: (
      <PermissionRoute permission="quotes.create">
        <QuotesModule />
      </PermissionRoute>
    )
  },
  {
    path: 'quotes/:id',
    element: (
      <PermissionRoute permission="quotes.view">
        <QuotesModule />
      </PermissionRoute>
    )
  },

  // Factures - nécessite la permission invoices.view
  {
    path: 'invoices',
    element: (
      <PermissionRoute permission="invoices.view">
        <InvoicesModule />
      </PermissionRoute>
    )
  },
  {
    path: 'invoices/new',
    element: (
      <PermissionRoute permission="invoices.create">
        <InvoicesModule />
      </PermissionRoute>
    )
  },
  {
    path: 'invoices/:id',
    element: (
      <PermissionRoute permission="invoices.view">
        <InvoicesModule />
      </PermissionRoute>
    )
  },

  // Consentements
  {
    path: 'consents',
    element: (
      <PermissionRoute permission="consents.view">
        <ConsentManagementModule />
      </PermissionRoute>
    )
  },
  {
    path: 'consent-templates',
    element: (
      <PermissionRoute permission="consent_templates.view">
        <ConsentTemplatesModule />
      </PermissionRoute>
    )
  },

  // Catalogue - produits, traitements et services
  {
    path: 'catalog',
    element: (
      <PermissionRoute permission="catalog.view">
        <CatalogModule />
      </PermissionRoute>
    )
  },

  // Paramètres - accessible à tous les utilisateurs authentifiés
  { path: 'settings', element: <SettingsModule /> }
];

/**
 * Routes d'administration (réutilisables)
 */
const adminRoutes = [
  { index: true, element: <AdminOverview /> },
  { path: 'clinic-config', element: <ClinicConfigurationModule /> },
  { path: 'users', element: <UserManagementModule /> },
  { path: 'roles', element: <RoleManagementModule /> },
  { path: 'teams', element: <TeamManagementModule /> },
  { path: 'audit', element: <AuditManagementModule /> }
];

/**
 * Configuration des routes de l'application
 * Structure hiérarchique avec layouts et routes protégées
 */
export const routes = [
  // ============================================
  // ROUTES PUBLIQUES SANS LOCALE (consent signing)
  // ============================================
  {
    path: '/sign-consent/:token',
    element: <ConsentSigningPage />
  },
  {
    path: '/public/consent/:token',
    element: <ConsentSigningPage />
  },

  // ============================================
  // ROOT REDIRECT - Détection automatique de locale
  // ============================================
  {
    path: '/',
    element: <LocaleRedirect defaultPath="/login" />
  },

  // ============================================
  // ROUTES AVEC LOCALE PREFIX (/:locale/*)
  // ============================================
  {
    path: '/:locale',
    element: <LocaleGuard />,
    children: [
      // Routes publiques (non authentifiées)
      {
        element: <PublicRoute><AuthLayout /></PublicRoute>,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'login', element: <LoginPage /> },
          { path: 'signup', element: <SignupPage /> },
          { path: 'email-verification', element: <EmailVerificationPage /> },
          { path: 'auth/verify-email/:token', element: <EmailVerificationCallback /> },
          { path: 'auth/provisioning', element: <ClinicProvisioningPage /> },
          { path: 'set-password', element: <SetPasswordPage /> }
        ]
      },

      // Route d'onboarding (authentification requise, sans OnboardingGuard)
      {
        path: 'onboarding',
        element: <ProtectedRoute><OnboardingWizard /></ProtectedRoute>
      },

      // Routes protégées (authentification requise + vérification setup)
      {
        element: (
          <ProtectedRoute>
            <OnboardingGuard>
              <DashboardLayout />
            </OnboardingGuard>
          </ProtectedRoute>
        ),
        children: dashboardRoutes
      },

      // Routes d'administration (rôle admin requis + vérification setup)
      {
        element: (
          <ProtectedRoute>
            <OnboardingGuard>
              <DashboardLayout />
            </OnboardingGuard>
          </ProtectedRoute>
        ),
        children: [
          {
            path: 'admin',
            element: <AdminRoute><AdminLayout /></AdminRoute>,
            children: adminRoutes
          }
        ]
      }
    ]
  },

  // ============================================
  // LEGACY ROUTES - Redirections pour compatibilité
  // Ces routes redirigent vers les nouvelles URLs avec locale
  // ============================================

  // Legacy auth routes
  { path: '/login', element: <LegacyRouteRedirect /> },
  { path: '/signup', element: <LegacyRouteRedirect /> },
  { path: '/email-verification', element: <LegacyRouteRedirect /> },
  { path: '/auth/verify-email/:token', element: <LegacyRouteRedirect /> },
  { path: '/onboarding', element: <LegacyRouteRedirect /> },

  // Legacy dashboard routes
  { path: '/dashboard', element: <LegacyRouteRedirect /> },
  { path: '/home', element: <LegacyRouteRedirect /> },
  { path: '/patients', element: <LegacyRouteRedirect /> },
  { path: '/patients/:id', element: <LegacyRouteRedirect /> },
  { path: '/medical-records', element: <LegacyRouteRedirect /> },
  { path: '/medical-records/:patientId', element: <LegacyRouteRedirect /> },
  { path: '/appointments', element: <LegacyRouteRedirect /> },
  { path: '/appointments/new', element: <LegacyRouteRedirect /> },
  { path: '/appointments/:id', element: <LegacyRouteRedirect /> },
  { path: '/quotes', element: <LegacyRouteRedirect /> },
  { path: '/quotes/new', element: <LegacyRouteRedirect /> },
  { path: '/quotes/:id', element: <LegacyRouteRedirect /> },
  { path: '/invoices', element: <LegacyRouteRedirect /> },
  { path: '/invoices/new', element: <LegacyRouteRedirect /> },
  { path: '/invoices/:id', element: <LegacyRouteRedirect /> },
  { path: '/consents', element: <LegacyRouteRedirect /> },
  { path: '/consent-templates', element: <LegacyRouteRedirect /> },
  { path: '/catalog', element: <LegacyRouteRedirect /> },
  { path: '/settings', element: <LegacyRouteRedirect /> },

  // Legacy admin routes
  { path: '/admin', element: <LegacyRouteRedirect /> },
  { path: '/admin/*', element: <LegacyRouteRedirect /> },

  // ============================================
  // CATCH-ALL - Redirection par défaut
  // ============================================
  { path: '*', element: <LocaleRedirect defaultPath="/login" /> }
];

export default routes;
