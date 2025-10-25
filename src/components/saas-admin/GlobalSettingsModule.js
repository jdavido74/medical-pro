// components/saas-admin/GlobalSettingsModule.js
import React from 'react';
import { Settings } from 'lucide-react';

const GlobalSettingsModule = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-lg border text-center">
        <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Configuración Global
        </h3>
        <p className="text-gray-600">
          Parámetros globales de la plataforma SaaS MedicalPro
        </p>
      </div>
    </div>
  );
};

export default GlobalSettingsModule;
