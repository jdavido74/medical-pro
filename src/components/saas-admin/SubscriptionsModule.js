// components/saas-admin/SubscriptionsModule.js
import React from 'react';
import { Crown } from 'lucide-react';

const SubscriptionsModule = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-lg border text-center">
        <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Gestión de Suscripciones
        </h3>
        <p className="text-gray-600">
          Administrar planes, pagos y facturación de las clínicas
        </p>
      </div>
    </div>
  );
};

export default SubscriptionsModule;
