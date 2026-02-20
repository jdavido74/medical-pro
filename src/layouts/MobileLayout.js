/**
 * MobileLayout - Layout mobile-first pour les infirmiers/personnel soignant
 * Navigation par onglets en bas, pas de sidebar
 */

import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Calendar, Activity, Shield, LogOut, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../contexts/LocaleContext';

const MobileLayout = () => {
  const { user, company, logout } = useAuth();
  const { t } = useTranslation('mobile');
  const { buildUrl } = useLocale();
  const navigate = useNavigate();

  const handleLogout = () => {
    const shouldRememberEmail = localStorage.getItem('clinicmanager_remember_me') === 'true';
    logout(shouldRememberEmail);
  };

  const initials = user
    ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : '?';

  const tabs = [
    { path: 'home', icon: Home, label: t('tabs.home') },
    { path: 'appointments', icon: Calendar, label: t('tabs.appointments') },
    { path: 'booking', icon: Search, label: t('tabs.booking') },
    { path: 'vitals', icon: Activity, label: t('tabs.vitals') },
    { path: 'consents', icon: Shield, label: t('tabs.consents') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-semibold text-sm text-gray-900 truncate max-w-[180px]">
            {company?.name || 'Medical Pro'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-700 text-xs font-semibold">{initials}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title={t('common.logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Scrollable content area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
        <div className="flex items-center justify-around h-16">
          {tabs.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={buildUrl(`/mobile/${path}`)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-0 flex-1 transition-colors ${
                  isActive
                    ? 'text-green-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;
