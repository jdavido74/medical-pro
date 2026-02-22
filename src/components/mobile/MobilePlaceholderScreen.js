/**
 * MobilePlaceholderScreen - Placeholder for features coming in future sprints
 * Used for Vitals and Consents tabs
 */

import React from 'react';
import { Activity, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const MobilePlaceholderScreen = () => {
  const { t } = useTranslation('mobile');
  const location = useLocation();

  const isVitals = location.pathname.includes('/vitals');
  const namespace = isVitals ? 'vitals' : 'consents';
  const Icon = isVitals ? Activity : Shield;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon size={32} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        {t(`${namespace}.comingSoon`)}
      </h2>
      <p className="text-sm text-gray-500 max-w-xs">
        {t(`${namespace}.comingSoonDesc`)}
      </p>
    </div>
  );
};

export default MobilePlaceholderScreen;
