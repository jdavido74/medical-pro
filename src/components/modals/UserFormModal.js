// components/modals/UserFormModal.js
import React, { useState, useEffect } from 'react';
import { X, User, Mail, Building, Award, Shield, Eye, EyeOff, Briefcase } from 'lucide-react';
import { permissionsStorage } from '../../utils/permissionsStorage';
import { useFormErrors } from '../../hooks/useFormErrors';
import { TextField, SelectField, CheckboxField } from '../common/FormField';
import ErrorMessage from '../common/ErrorMessage';
import PhoneInput from '../common/PhoneInput';
import { useTranslation } from 'react-i18next';
import {
  ADMINISTRATIVE_ROLES,
  ADMINISTRATIVE_ROLE_LABELS,
  ADMINISTRATIVE_ROLE_DESCRIPTIONS
} from '../../utils/userRoles';

const UserFormModal = ({ isOpen, onClose, onSave, user = null, currentUser }) => {
  const { t } = useTranslation(['admin', 'common']);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    sendInvitation: false, // Par défaut, on définit le mot de passe directement
    role: 'readonly',
    administrativeRole: '', // Rôle administratif optionnel (direction, clinic_admin, hr, billing)
    department: '',
    speciality: '',
    licenseNumber: '',
    isActive: true,
    accountStatus: 'active'
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
  const [showPassword, setShowPassword] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [phoneValid, setPhoneValid] = useState(true); // Phone is optional

  // Départements prédéfinis (clés de traduction)
  const departmentKeys = [
    'direction',
    'administration',
    'generalMedicine',
    'cardiology',
    'dermatology',
    'gynecology',
    'pediatrics',
    'radiology',
    'surgery',
    'nursing',
    'reception',
    'pharmacy',
    'laboratory',
    'physiotherapy',
    'audit'
  ];

  // Spécialités par département (valeurs non traduites car spécifiques au domaine médical)
  const specialitiesByDepartment = {
    'direction': ['Gestion', 'Stratégie', 'Qualité'],
    'administration': ['Ressources Humaines', 'Comptabilité', 'Informatique'],
    'generalMedicine': ['Médecine Générale', 'Médecine Préventive'],
    'cardiology': ['Cardiologie Interventionnelle', 'Rythmologie', 'Insuffisance Cardiaque'],
    'dermatology': ['Dermatologie Générale', 'Dermatologie Esthétique', 'Dermatopathologie'],
    'gynecology': ['Gynécologie Médicale', 'Obstétrique', 'PMA'],
    'pediatrics': ['Pédiatrie Générale', 'Néonatologie', 'Pédopsychiatrie'],
    'radiology': ['Radiologie Conventionnelle', 'Scanner', 'IRM', 'Échographie'],
    'surgery': ['Chirurgie Générale', 'Chirurgie Orthopédique', 'Chirurgie Esthétique'],
    'nursing': ['Soins Généraux', 'Soins Intensifs', 'Bloc Opératoire'],
    'reception': ['Administration', 'Secrétariat Médical', 'Facturation'],
    'pharmacy': ['Pharmacie Clinique', 'Stérilisation'],
    'laboratory': ['Biologie Médicale', 'Anatomopathologie'],
    'physiotherapy': ['Kinésithérapie Générale', 'Kinésithérapie Sportive'],
    'audit': ['Consultation', 'Contrôle Qualité']
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
          administrativeRole: user.administrativeRole || user.administrative_role || '',
          department: user.department || '',
          speciality: user.speciality || '',
          licenseNumber: user.licenseNumber || '',
          isActive: user.isActive !== undefined ? user.isActive : true
        });
      } else {
        // Réinitialiser pour création
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          phone: '',
          password: '',
          sendInvitation: false, // Par défaut, on définit le mot de passe directement
          role: accessibleRoles.length > 0 ? accessibleRoles[accessibleRoles.length - 1].id : 'readonly',
          administrativeRole: '',
          department: '',
          speciality: '',
          licenseNumber: '',
          isActive: true,
          accountStatus: 'active'
        });
      }

      clearErrors();
    }
  }, [isOpen, user, currentUser, clearErrors]);

  const validateForm = () => {
    clearErrors();
    let isValid = true;

    // Email requis et format
    if (!formData.email.trim()) {
      setFieldError('email', t('admin:usersManagement.validation.emailRequired'));
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFieldError('email', t('admin:usersManagement.validation.emailInvalid'));
      isValid = false;
    }

    // Prénom requis
    if (!formData.firstName.trim()) {
      setFieldError('firstName', t('admin:usersManagement.validation.firstNameRequired'));
      isValid = false;
    }

    // Nom requis
    if (!formData.lastName.trim()) {
      setFieldError('lastName', t('admin:usersManagement.validation.lastNameRequired'));
      isValid = false;
    }

    // Téléphone format international - validé par le composant PhoneInput
    if (formData.phone && !phoneValid) {
      setFieldError('phone', t('admin:usersManagement.validation.phoneInvalid'));
      isValid = false;
    }

    // Mot de passe requis uniquement si pas d'invitation et création d'utilisateur
    if (!user && !formData.sendInvitation) {
      if (!formData.password || formData.password.trim().length < 6) {
        setFieldError('password', t('admin:usersManagement.validation.passwordRequired'));
        isValid = false;
      }
    }

    // Rôle requis
    if (!formData.role) {
      setFieldError('role', t('admin:usersManagement.validation.roleRequired'));
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user ? t('admin:usersManagement.modal.editUser') : t('admin:usersManagement.modal.newUser')}
              </h2>
              <p className="text-sm text-gray-600">
                {user ? t('admin:usersManagement.modal.editUserDesc') : t('admin:usersManagement.modal.newUserDesc')}
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

        {/* Form - Takes remaining space */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Content - Scrollable */}
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
                label={t('admin:usersManagement.fields.firstName')}
                name="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                error={getFieldError('firstName')}
                required
                placeholder={t('admin:usersManagement.fields.firstName')}
                icon={User}
              />

              <TextField
                label={t('admin:usersManagement.fields.lastName')}
                name="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                error={getFieldError('lastName')}
                required
                placeholder={t('admin:usersManagement.fields.lastName')}
                icon={User}
              />

              <TextField
                label={t('admin:usersManagement.fields.email')}
                name="user_new_email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={getFieldError('email')}
                required
                icon={Mail}
                placeholder="utilisateur@medicalpro.com"
                disabled={!!user}
                autoComplete="new-email"
              />

              <PhoneInput
                value={formData.phone}
                onChange={(e) => {
                  handleInputChange('phone', e.target.value);
                }}
                onValidationChange={(isValid) => setPhoneValid(isValid)}
                defaultCountry="FR"
                name="phone"
                label={t('admin:usersManagement.fields.phone')}
                required={false}
                error={getFieldError('phone')}
                showValidation
              />
            </div>

            {user && (
              <p className="-mt-3 ml-1 text-xs text-gray-500">
                {t('admin:usersManagement.fields.emailReadonly')}
              </p>
            )}

            {/* Mode de création: Invitation ou Mot de passe direct */}
            {!user && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckboxField
                  label={t('admin:usersManagement.invitation.sendInvitation')}
                  name="sendInvitation"
                  checked={formData.sendInvitation}
                  onChange={(e) => handleInputChange('sendInvitation', e.target.checked)}
                />
                {!formData.sendInvitation && (
                  <div className="mt-4">
                    <div className="relative">
                      <TextField
                        label={t('admin:usersManagement.invitation.password')}
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        error={getFieldError('password')}
                        required
                        placeholder={t('admin:usersManagement.invitation.passwordPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
                        title={showPassword ? t('common:hide') : t('common:show')}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="mt-1 ml-1 text-xs text-gray-500">
                      {t('admin:usersManagement.invitation.passwordNote')}
                    </p>
                  </div>
                )}
                {formData.sendInvitation && (
                  <p className="mt-2 ml-1 text-xs text-blue-600">
                    {t('admin:usersManagement.invitation.invitationNote')}
                  </p>
                )}
              </div>
            )}

            {/* Rôle et permissions */}
            <div className="space-y-4">
              <div>
                <SelectField
                  label={t('admin:usersManagement.roles.businessRole')}
                  name="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  error={getFieldError('role')}
                  required
                  icon={Shield}
                  options={availableRoles.map(role => ({
                    value: role.id,
                    label: `${role.name} (${t('admin:rolesManagement.roleList.level')} ${role.level})`
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

              {/* Rôle administratif (optionnel, cumulable avec le rôle métier) */}
              <div>
                <SelectField
                  label={t('admin:usersManagement.roles.administrativeRole')}
                  name="administrativeRole"
                  value={formData.administrativeRole}
                  onChange={(e) => handleInputChange('administrativeRole', e.target.value)}
                  icon={Briefcase}
                  placeholder={t('admin:usersManagement.roles.noAdminRole')}
                  options={[
                    { value: '', label: t('admin:usersManagement.roles.noAdminRole') },
                    ...ADMINISTRATIVE_ROLES.map(role => ({
                      value: role,
                      label: ADMINISTRATIVE_ROLE_LABELS[role]
                    }))
                  ]}
                />
                {formData.administrativeRole && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                    <span className="font-medium text-amber-800">
                      {ADMINISTRATIVE_ROLE_DESCRIPTIONS[formData.administrativeRole]}
                    </span>
                  </div>
                )}
                <p className="mt-1 ml-1 text-xs text-gray-500">
                  {t('admin:usersManagement.roles.administrativeRoleNote')}
                </p>
              </div>
            </div>

            {/* Département et spécialité */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label={t('admin:usersManagement.department.label')}
                name="department"
                value={formData.department}
                onChange={(e) => {
                  handleInputChange('department', e.target.value);
                  handleInputChange('speciality', ''); // Reset speciality
                }}
                icon={Building}
                placeholder={t('admin:usersManagement.department.placeholder')}
                options={departmentKeys.map(key => ({
                  value: key,
                  label: t(`admin:departments.${key}`)
                }))}
              />

              <SelectField
                label={t('admin:usersManagement.specialty.label')}
                name="speciality"
                value={formData.speciality}
                onChange={(e) => handleInputChange('speciality', e.target.value)}
                icon={Award}
                placeholder={t('admin:usersManagement.specialty.placeholder')}
                disabled={!formData.department}
                options={getAvailableSpecialities().map(spec => ({ value: spec, label: spec }))}
              />
            </div>

            {/* Numéro de licence (optionnel) */}
            <TextField
              label={t('admin:usersManagement.license.label')}
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
              error={getFieldError('licenseNumber')}
              icon={Award}
              placeholder={t('admin:usersManagement.license.placeholder')}
            />
            <p className="-mt-4 ml-1 text-xs text-gray-500">
              {t('admin:usersManagement.license.note')}
            </p>

            {/* Statut actif */}
            <CheckboxField
              label={t('admin:usersManagement.accountActive')}
              name="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
            />

          </div>

          {/* Footer - Fixed at bottom */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t('common:cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? t('admin:usersManagement.buttons.saving') : (user ? t('admin:usersManagement.buttons.edit') : t('admin:usersManagement.buttons.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
