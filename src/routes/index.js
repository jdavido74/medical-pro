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

// Locale components
import LocaleRedirect, { LegacyRouteRedirect } from '../components/routing/LocaleRedirect';
import LocaleGuard from '../components/routing/LocaleGuard';

/**
 * Routes protégées du dashboard (réutilisables)
 */
const dashboardRoutes = [
  // Dashboard principal
  { path: 'dashboard', element: <HomeModule /> },
  { path: 'home', element: <Navigate to="../dashboard" replace /> },

  // Patients
  { path: 'patients', element: <PatientsModule /> },
  { path: 'patients/:id', element: <PatientsModule /> },

  // Dossiers médicaux
  { path: 'medical-records', element: <MedicalRecordsModule /> },
  { path: 'medical-records/:patientId', element: <MedicalRecordsModule /> },

  // Rendez-vous
  { path: 'appointments', element: <AppointmentsModule /> },
  { path: 'appointments/new', element: <AppointmentsModule /> },
  { path: 'appointments/:id', element: <AppointmentsModule /> },

  // Devis
  { path: 'quotes', element: <QuotesModule /> },
  { path: 'quotes/new', element: <QuotesModule /> },
  { path: 'quotes/:id', element: <QuotesModule /> },

  // Factures
  { path: 'invoices', element: <InvoicesModule /> },
  { path: 'invoices/new', element: <InvoicesModule /> },
  { path: 'invoices/:id', element: <InvoicesModule /> },

  // Consentements
  { path: 'consents', element: <ConsentManagementModule /> },
  { path: 'consent-templates', element: <ConsentTemplatesModule /> },

  // Paramètres
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
          { path: 'auth/verify-email/:token', element: <EmailVerificationCallback /> }
        ]
      },

      // Routes protégées (authentification requise)
      {
        element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
        children: dashboardRoutes
      },

      // Routes d'administration (rôle admin requis)
      {
        element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
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
