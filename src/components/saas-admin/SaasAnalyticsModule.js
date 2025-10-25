// components/saas-admin/SaasAnalyticsModule.js
import React from 'react';
import { TrendingUp } from 'lucide-react';

const SaasAnalyticsModule = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-lg border text-center">
        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Analíticas Globales
        </h3>
        <p className="text-gray-600">
          Métricas y estadísticas de uso de toda la plataforma SaaS
        </p>
      </div>
    </div>
  );
};

export default SaasAnalyticsModule;
