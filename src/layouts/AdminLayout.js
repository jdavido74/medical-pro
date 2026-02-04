/**
 * Layout pour les pages d'administration
 * Contient uniquement la navigation par onglets (le Sidebar et Header viennent de DashboardLayout)
 */

import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Users, Shield, BarChart3,
  Calendar, Activity, Tags, Receipt
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../contexts/LocaleContext';

const AdminLayout = () => {
  const { t } = useTranslation();
  const { buildUrl } = useLocale();

  const tabs = [
    { id: 'overview', path: buildUrl('/admin'), label: t('admin.overview'), icon: BarChart3, end: true },
    { id: 'clinic-config', path: buildUrl('/admin/clinic-config'), label: t('admin.clinicConfig'), icon: Calendar },
    { id: 'users', path: buildUrl('/admin/users'), label: t('admin.users'), icon: Users },
    { id: 'roles', path: buildUrl('/admin/roles'), label: t('admin.roles'), icon: Shield },
    { id: 'teams', path: buildUrl('/admin/teams'), label: t('admin.teams'), icon: Users },
    { id: 'audit', path: buildUrl('/admin/audit'), label: t('admin.audit'), icon: Activity },
    { id: 'categories', path: buildUrl('/admin/categories'), label: t('admin.systemCategories', 'Catégories'), icon: Tags },
    { id: 'billing', path: buildUrl('/admin/billing'), label: t('admin.billingTab', 'Facturation'), icon: Receipt }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <nav className="flex space-x-8 px-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                end={tab.end}
                className={({ isActive }) =>
                  `flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
