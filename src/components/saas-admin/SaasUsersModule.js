// components/saas-admin/SaasUsersModule.js
import React from 'react';
import { Users } from 'lucide-react';

const SaasUsersModule = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-lg border text-center">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Gestión de Todos los Usuarios
        </h3>
        <p className="text-gray-600">
          Vista consolidada de todos los usuarios de todas las clínicas
        </p>
      </div>
    </div>
  );
};

export default SaasUsersModule;
