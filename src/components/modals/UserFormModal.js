// components/modals/UserFormModal.js
import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building, Award, Shield, Settings, Eye, EyeOff } from 'lucide-react';
import { permissionsStorage } from '../../utils/permissionsStorage';
import { usersStorage } from '../../utils/usersStorage';
import { useFormErrors } from '../../hooks/useFormErrors';
import { TextField, SelectField, CheckboxField } from '../common/FormField';
import ErrorMessage from '../common/ErrorMessage';
import { validateInternationalPhone } from '../../utils/errorHandler';

const UserFormModal = ({ isOpen, onClose, onSave, user = null, currentUser }) => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'readonly',
    department: '',
    speciality: '',
    licenseNumber: '',
    isActive: true,
    preferences: {
      language: 'fr',
      timezone: 'Europe/Paris',
      notifications: {
        email: true,
        sms: false,
        push: true
      }
    },
    sessionInfo: {
      maxConcurrentSessions: 2,
      sessionTimeout: 240
    }
  });

  const {
    errors,
    generalError,
    setFieldError,
    clearFieldError,
    clearErrors,
    handleBackendError,
    getFieldError
  } = useFormErrors();

  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);

  // Départements prédéfinis
  const departments = [
    'Direction',
    'Administration',
    'Médecine Générale',
    'Cardiologie',
    'Dermatologie',
    'Gynécologie',
    'Pédiatrie',
    'Radiologie',
    'Chirurgie',
    'Soins Infirmiers',
    'Accueil',
    'Pharmacie',
    'Laboratoire',
    'Kinésithérapie',
    'Audit'
  ];

  // Spécialités par département
  const specialitiesByDepartment = {
    'Direction': ['Gestion', 'Stratégie', 'Qualité'],
    'Administration': ['Ressources Humaines', 'Comptabilité', 'Informatique'],
    'Médecine Générale': ['Médecine Générale', 'Médecine Préventive'],
    'Cardiologie': ['Cardiologie Interventionnelle', 'Rythmologie', 'Insuffisance Cardiaque'],
    'Dermatologie': ['Dermatologie Générale', 'Dermatologie Esthétique', 'Dermatopathologie'],
    'Gynécologie': ['Gynécologie Médicale', 'Obstétrique', 'PMA'],
    'Pédiatrie': ['Pédiatrie Générale', 'Néonatologie', 'Pédopsychiatrie'],
    'Radiologie': ['Radiologie Conventionnelle', 'Scanner', 'IRM', 'Échographie'],
    'Chirurgie': ['Chirurgie Générale', 'Chirurgie Orthopédique', 'Chirurgie Esthétique'],
    'Soins Infirmiers': ['Soins Généraux', 'Soins Intensifs', 'Bloc Opératoire'],
    'Accueil': ['Administration', 'Secrétariat Médical', 'Facturation'],
    'Pharmacie': ['Pharmacie Clinique', 'Stérilisation'],
    'Laboratoire': ['Biologie Médicale', 'Anatomopathologie'],
    'Kinésithérapie': ['Kinésithérapie Générale', 'Kinésithérapie Sportive'],
    'Audit': ['Consultation', 'Contrôle Qualité']
  };

  useEffect(() => {
    if (isOpen) {
      // Charger les rôles disponibles selon les permissions de l'utilisateur actuel
      const roles = permissionsStorage.getAllRoles();
      const currentUserRole = permissionsStorage.getRoleById(currentUser.role);

      // Filtrer les rôles selon les permissions
      const accessibleRoles = roles.filter(role => {
        // Super admin peut attribuer tous les rôles
        if (currentUser.role === 'super_admin') return true;

        // Admin peut attribuer tous les rôles sauf super_admin
        if (currentUser.role === 'admin') return role.id !== 'super_admin';

        // Autres rôles ne peuvent pas créer d'utilisateurs
        return false;
      });

      setAvailableRoles(accessibleRoles);

      // Pré-remplir si modification
      if (user) {
        setFormData({
          email: user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || '',
          role: user.role || 'readonly',
          department: user.department || '',
          speciality: user.speciality || '',
          licenseNumber: user.licenseNumber || '',
          isActive: user.isActive !== undefined ? user.isActive : true,
          preferences: {
            language: user.preferences?.language || 'fr',
            timezone: user.preferences?.timezone || 'Europe/Paris',
            notifications: {
              email: user.preferences?.notifications?.email !== undefined ?
                     user.preferences.notifications.email : true,
              sms: user.preferences?.notifications?.sms !== undefined ?
                   user.preferences.notifications.sms : false,
              push: user.preferences?.notifications?.push !== undefined ?
                    user.preferences.notifications.push : true
            }
          },
          sessionInfo: {
            maxConcurrentSessions: user.sessionInfo?.maxConcurrentSessions || 2,
            sessionTimeout: user.sessionInfo?.sessionTimeout || 240
          }
        });
      } else {
        // Réinitialiser pour création
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          phone: '',
          role: accessibleRoles.length > 0 ? accessibleRoles[accessibleRoles.length - 1].id : 'readonly',
          department: '',
          speciality: '',
          licenseNumber: '',
          isActive: true,
          preferences: {
            language: 'fr',
            timezone: 'Europe/Paris',
            notifications: {
              email: true,
              sms: false,
              push: true
            }
          },
          sessionInfo: {
            maxConcurrentSessions: 2,
            sessionTimeout: 240
          }
        });
      }

      clearErrors();
      setShowAdvanced(false);
    }
  }, [isOpen, user, currentUser, clearErrors]);

  const validateForm = () => {
    clearErrors();
    let isValid = true;

    // Email requis et format
    if (!formData.email.trim()) {
      setFieldError('email', 'Email requis');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFieldError('email', 'Format email invalide');
      isValid = false;
    }

    // Prénom requis
    if (!formData.firstName.trim()) {
      setFieldError('firstName', 'Prénom requis');
      isValid = false;
    }

    // Nom requis
    if (!formData.lastName.trim()) {
      setFieldError('lastName', 'Nom requis');
      isValid = false;
    }

    // Téléphone format international (France, Espagne, autres pays)
    if (formData.phone && !validateInternationalPhone(formData.phone)) {
      setFieldError('phone', 'Format téléphone invalide (8-15 chiffres attendus)');
      isValid = false;
    }

    // Rôle requis
    if (!formData.role) {
      setFieldError('role', 'Rôle requis');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSave(formData);
      clearErrors();
      onClose();
    } catch (error) {
      console.error('[UserFormModal] Error saving user:', error);
      handleBackendError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Effacer l'erreur du champ modifié
    clearFieldError(field);
  };

  const handleNestedInputChange = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const getAvailableSpecialities = () => {
    return specialitiesByDepartment[formData.department] || [];
  };

  const getRoleColor = (roleId) => {
    const role = permissionsStorage.getRoleById(roleId);
    if (role?.level >= 90) return 'text-red-600';
    if (role?.level >= 70) return 'text-orange-600';
    if (role?.level >= 50) return 'text-blue-600';
    if (role?.level >= 30) return 'text-green-600';
    return 'text-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <p className="text-sm text-gray-600">
                {user ? 'Modifier les informations de l\'utilisateur' : 'Créer un nouveau compte utilisateur'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Erreur générale */}
            {generalError && (
              <ErrorMessage
                message={generalError.message}
                details={generalError.details}
                type={generalError.type === 'validation' ? 'validation' : 'error'}
              />
            )}

            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={getFieldError('email')}
                required
                icon={Mail}
                placeholder="utilisateur@medicalpro.com"
              />

              <TextField
                label="Téléphone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                error={getFieldError('phone')}
                icon={Phone}
                placeholder="+33 6 12 34 56 78 ou +34 612 345 678"
              />

              <TextField
                label="Prénom"
                name="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                error={getFieldError('firstName')}
                required
                placeholder="Prénom"
              />

              <TextField
                label="Nom"
                name="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                error={getFieldError('lastName')}
                required
                placeholder="Nom"
              />
            </div>

            {/* Rôle et permissions */}
            <div>
              <SelectField
                label="Rôle"
                name="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                error={getFieldError('role')}
                required
                icon={Shield}
                options={availableRoles.map(role => ({
                  value: role.id,
                  label: `${role.name} (Niveau ${role.level})`
                }))}
              />
              {formData.role && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <span className={`font-medium ${getRoleColor(formData.role)}`}>
                    {permissionsStorage.getRoleById(formData.role)?.description}
                  </span>
                </div>
              )}
            </div>

            {/* Département et spécialité */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Département"
                name="department"
                value={formData.department}
                onChange={(e) => {
                  handleInputChange('department', e.target.value);
                  handleInputChange('speciality', ''); // Reset speciality
                }}
                icon={Building}
                placeholder="Sélectionner un département"
                options={departments.map(dept => ({ value: dept, label: dept }))}
              />

              <SelectField
                label="Spécialité"
                name="speciality"
                value={formData.speciality}
                onChange={(e) => handleInputChange('speciality', e.target.value)}
                icon={Award}
                placeholder="Sélectionner une spécialité"
                disabled={!formData.department}
                options={getAvailableSpecialities().map(spec => ({ value: spec, label: spec }))}
              />
            </div>

            {/* Numéro de licence (optionnel) */}
            <TextField
              label="Numéro de licence/ordre (optionnel)"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
              error={getFieldError('licenseNumber')}
              icon={Award}
              placeholder="Ex: RPPS, ADELI, numéro d'ordre..."
            />
            <p className="-mt-4 ml-1 text-xs text-gray-500">
              RPPS pour médecin, ADELI pour infirmier, numéro d'ordre, etc.
            </p>

            {/* Statut actif */}
            <CheckboxField
              label="Compte actif"
              name="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
            />

            {/* Paramètres avancés */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Settings className="h-4 w-4" />
                Paramètres avancés
                {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                  {/* Sessions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sessions simultanées max
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.sessionInfo.maxConcurrentSessions}
                        onChange={(e) => handleNestedInputChange('sessionInfo.maxConcurrentSessions', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeout session (minutes)
                      </label>
                      <select
                        value={formData.sessionInfo.sessionTimeout}
                        onChange={(e) => handleNestedInputChange('sessionInfo.sessionTimeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="120">2 heures</option>
                        <option value="240">4 heures</option>
                        <option value="480">8 heures</option>
                        <option value="720">12 heures</option>
                      </select>
                    </div>
                  </div>

                  {/* Notifications */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Notifications</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.preferences.notifications.email}
                          onChange={(e) => handleNestedInputChange('preferences.notifications.email', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Notifications par email</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.preferences.notifications.sms}
                          onChange={(e) => handleNestedInputChange('preferences.notifications.sms', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Notifications par SMS</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.preferences.notifications.push}
                          onChange={(e) => handleNestedInputChange('preferences.notifications.push', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Notifications push</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Enregistrement...' : (user ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;