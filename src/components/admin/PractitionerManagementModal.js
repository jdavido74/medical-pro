// components/admin/PractitionerManagementModal.js - Gestion des praticiens
import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit2, Trash2, User, Mail, Phone, Stethoscope, Calendar, Check } from 'lucide-react';
import { practitionersStorage } from '../../utils/clinicConfigStorage';
import { useTranslation } from 'react-i18next';

const PractitionerManagementModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [practitioners, setPractitioners] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [editingPractitioner, setEditingPractitioner] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    speciality: '',
    license: '',
    isActive: true,
    type: 'doctor',
    color: 'blue'
  });

  useEffect(() => {
    if (isOpen) {
      loadPractitioners();
    }
  }, [isOpen]);

  const loadPractitioners = () => {
    const allPractitioners = practitionersStorage.getAll();
    setPractitioners(allPractitioners);
  };

  const handleSave = () => {
    loadPractitioners();
    onSave?.();
  };

  const handleAddNew = () => {
    setEditingPractitioner(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      speciality: '',
      license: '',
      isActive: true,
      type: 'doctor',
      color: 'blue'
    });
    setActiveTab('form');
  };

  const handleEdit = (practitioner) => {
    setEditingPractitioner(practitioner);
    setFormData({
      firstName: practitioner.firstName || '',
      lastName: practitioner.lastName || '',
      email: practitioner.email || '',
      phone: practitioner.phone || '',
      speciality: practitioner.speciality || '',
      license: practitioner.license || '',
      isActive: practitioner.isActive !== false,
      type: practitioner.type || 'doctor',
      color: practitioner.color || 'blue'
    });
    setActiveTab('form');
  };

  const handleDelete = (practitionerId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce praticien ?')) {
      practitionersStorage.delete(practitionerId);
      loadPractitioners();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingPractitioner) {
      practitionersStorage.update(editingPractitioner.id, formData);
    } else {
      practitionersStorage.add(formData);
    }

    loadPractitioners();
    setActiveTab('list');
    setEditingPractitioner(null);
  };

  const practitionerTypes = [
    { value: 'doctor', label: 'Médecin', icon: Stethoscope },
    { value: 'nurse', label: 'Infirmier(e)', icon: User },
    { value: 'specialist', label: 'Spécialiste', icon: User },
    { value: 'therapist', label: 'Thérapeute', icon: User }
  ];

  const colorOptions = [
    { value: 'blue', label: 'Bleu', className: 'bg-blue-500' },
    { value: 'green', label: 'Vert', className: 'bg-green-500' },
    { value: 'red', label: 'Rouge', className: 'bg-red-500' },
    { value: 'purple', label: 'Violet', className: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', className: 'bg-orange-500' },
    { value: 'teal', label: 'Sarcelle', className: 'bg-teal-500' },
    { value: 'pink', label: 'Rose', className: 'bg-pink-500' },
    { value: 'indigo', label: 'Indigo', className: 'bg-indigo-500' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-600 to-green-700">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Gestion des Praticiens</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="h-4 w-4 inline mr-2" />
              Liste des praticiens
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'form'
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus className="h-4 w-4 inline mr-2" />
              {editingPractitioner ? 'Modifier' : 'Nouveau'} praticien
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'list' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Praticiens ({practitioners.length})
                </h3>
                <button
                  onClick={handleAddNew}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nouveau praticien
                </button>
              </div>

              {practitioners.length > 0 ? (
                <div className="grid gap-4">
                  {practitioners.map((practitioner) => (
                    <div key={practitioner.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                            colorOptions.find(c => c.value === practitioner.color)?.className || 'bg-blue-500'
                          }`}>
                            {practitioner.firstName?.[0]}{practitioner.lastName?.[0]}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">
                                {practitioner.firstName} {practitioner.lastName}
                              </h4>
                              {practitioner.isActive && (
                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                  Actif
                                </span>
                              )}
                              {!practitioner.isActive && (
                                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                                  Inactif
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <div className="flex items-center space-x-4">
                                <span className="flex items-center">
                                  <Stethoscope className="h-4 w-4 mr-1" />
                                  {practitioner.speciality}
                                </span>
                                <span className="flex items-center">
                                  <Mail className="h-4 w-4 mr-1" />
                                  {practitioner.email}
                                </span>
                                {practitioner.phone && (
                                  <span className="flex items-center">
                                    <Phone className="h-4 w-4 mr-1" />
                                    {practitioner.phone}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  practitioner.type === 'doctor' ? 'bg-blue-100 text-blue-800' :
                                  practitioner.type === 'nurse' ? 'bg-green-100 text-green-800' :
                                  practitioner.type === 'specialist' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {practitionerTypes.find(t => t.value === practitioner.type)?.label || practitioner.type}
                                </span>
                                {practitioner.license && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    Licence: {practitioner.license}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(practitioner)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(practitioner.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Aucun praticien enregistré</p>
                  <button
                    onClick={handleAddNew}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Ajouter le premier praticien
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'form' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {editingPractitioner ? 'Modifier le praticien' : 'Nouveau praticien'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Prénom du praticien"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Nom du praticien"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spécialité *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.speciality}
                      onChange={(e) => setFormData(prev => ({ ...prev, speciality: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Médecine générale, Cardiologie, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de licence
                    </label>
                    <input
                      type="text"
                      value={formData.license}
                      onChange={(e) => setFormData(prev => ({ ...prev, license: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Numéro ADELI, RPPS, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de praticien *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      {practitionerTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Couleur d'affichage
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                          className={`w-8 h-8 rounded-full ${color.className} flex items-center justify-center transition-transform hover:scale-110 ${
                            formData.color === color.value ? 'ring-2 ring-gray-400 ring-offset-2' : ''
                          }`}
                          title={color.label}
                        >
                          {formData.color === color.value && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Praticien actif</span>
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {editingPractitioner ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'list' && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end">
            <button
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PractitionerManagementModal;