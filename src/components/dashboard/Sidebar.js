// components/dashboard/Sidebar.js
import React from 'react';
import {
  Home, Users, Calendar, FileText, BarChart3, Settings,
  LogOut, Heart, Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const Sidebar = ({ activeModule, setActiveModule, setCurrentPage }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation('nav');

  const handleLogout = () => {
    logout();
    setCurrentPage('home');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const menuItems = [
    { id: 'home', label: t('sidebar.home'), icon: Home },
    { id: 'patients', label: t('sidebar.patients'), icon: Users },
    { id: 'appointments', label: t('sidebar.appointments'), icon: Calendar },
    { id: 'medical-records', label: t('sidebar.medicalRecords'), icon: FileText },
    { id: 'consents', label: t('sidebar.consents'), icon: Shield },
    { id: 'consent-templates', label: t('sidebar.consentTemplates'), icon: FileText },
    { id: 'quotes', label: t('sidebar.quotes'), icon: FileText },
    { id: 'invoices', label: t('sidebar.invoices'), icon: FileText },
    { id: 'analytics', label: t('sidebar.analytics'), icon: BarChart3 },
    ...(isAdmin ? [{ id: 'admin', label: t('sidebar.admin'), icon: Shield }] : []),
    { id: 'settings', label: t('sidebar.settings'), icon: Settings }
  ];

  return (
    <div className="w-64 bg-white shadow-sm border-r flex flex-col">
      {/* Logo et profil utilisateur */}
      <div className="p-6 border-b">
        <div className="flex items-center space-x-2 mb-4">
          <Heart className="h-8 w-8 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">ClinicManager</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{user?.avatar}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.companyName}</p>
            <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${
              user?.plan === 'premium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {user?.plan === 'premium' ? `👑 ${t('common.premium')}` : `🆓 ${t('common.free')}`}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeModule === item.id
                      ? 'bg-green-100 text-green-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
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