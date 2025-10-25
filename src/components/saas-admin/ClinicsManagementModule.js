// components/saas-admin/ClinicsManagementModule.js
import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Edit2, Trash2, Search, Eye,
  Users, Calendar, Crown, CheckCircle, XCircle, Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ClinicsManagementModule = () => {
  const { t } = useTranslation();
  const [clinics, setClinics] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = () => {
    // Simulación de datos - en producción vendría de una API
    const mockClinics = [
      {
        id: '1',
        name: 'Clínica Rodríguez',
        country: 'España',
        city: 'Madrid',
        email: 'admin@clinica-rodriguez.com',
        phone: '+34 91 234 5678',
        status: 'active',
        subscription: 'premium',
        users: 12,
        practitioners: 8,
        patients: 456,
        createdAt: '2024-01-15'
      },
      {
        id: '2',
        name: 'Centro Médico Barcelona',
        country: 'España',
        city: 'Barcelona',
        email: 'info@cmbarcelona.com',
        phone: '+34 93 456 7890',
        status: 'active',
        subscription: 'standard',
        users: 8,
        practitioners: 5,
        patients: 312,
        createdAt: '2024-02-20'
      },
      {
        id: '3',
        name: 'Clínica del Sol',
        country: 'España',
        city: 'Sevilla',
        email: 'contacto@clinicadelsol.com',
        phone: '+34 95 123 4567',
        status: 'inactive',
        subscription: 'basic',
        users: 4,
        practitioners: 3,
        patients: 145,
        createdAt: '2023-11-10'
      }
    ];
    setClinics(mockClinics);
  };

  const filteredClinics = clinics.filter(clinic =>
    clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinic.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinic.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSubscriptionBadge = (subscription) => {
    const badges = {
      premium: { color: 'bg-purple-100 text-purple-800', icon: Crown, label: 'Premium' },
      standard: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Standard' },
      basic: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle, label: 'Básico' }
    };
    const badge = badges[subscription] || badges.basic;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        <span>{badge.label}</span>
      </span>
    );
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? (
      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
        <CheckCircle className="h-3 w-3" />
        <span>Activa</span>
      </span>
    ) : (
      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
        <XCircle className="h-3 w-3" />
        <span>Inactiva</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('admin.clinicsManagement', 'Gestión de Clínicas')}
          </h2>
          <p className="text-gray-600 mt-1">
            {t('admin.manageClinicsDesc', 'Administrar todas las clínicas de la plataforma')}
          </p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          <span>{t('admin.addClinic', 'Nueva Clínica')}</span>
        </button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Clínicas</p>
              <p className="text-2xl font-bold text-gray-900">{clinics.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Activas</p>
              <p className="text-2xl font-bold text-gray-900">
                {clinics.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Crown className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Premium</p>
              <p className="text-2xl font-bold text-gray-900">
                {clinics.filter(c => c.subscription === 'premium').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">
                {clinics.reduce((sum, c) => sum + c.users, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin.searchClinics', 'Buscar clínicas por nombre, ciudad o email...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Lista de clínicas */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clínica
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suscripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuarios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pacientes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClinics.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{clinic.name}</div>
                        <div className="text-sm text-gray-500">{clinic.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{clinic.city}</div>
                    <div className="text-sm text-gray-500">{clinic.country}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(clinic.status)}
                  </td>
                  <td className="px-6 py-4">
                    {getSubscriptionBadge(clinic.subscription)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1 text-sm text-gray-900">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{clinic.users}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{clinic.patients}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Configuración"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClinicsManagementModule;
