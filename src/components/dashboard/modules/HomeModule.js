// components/dashboard/modules/HomeModule.js
import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, FileText, Heart, Plus, UserPlus,
  CalendarPlus, ArrowRight, Activity, Stethoscope,
  Clipboard, Clock, AlertCircle, Edit2, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { patientsStorage } from '../../../utils/patientsStorage';

const HomeModule = ({ setActiveModule }) => {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');
  const [incompletePatients, setIncompletePatients] = useState([]);
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    consultations: 0,
    pending: 0
  });

  // Charger les patients incomplets
  useEffect(() => {
    const allPatients = patientsStorage.getAll().filter(p => !p.deleted);
    const incomplete = allPatients.filter(p => p.isIncomplete);
    setIncompletePatients(incomplete);

    // Mettre à jour les stats
    setStats({
      patients: allPatients.length,
      appointments: 0,
      consultations: 0,
      pending: incomplete.length
    });
  }, []);

  const quickActions = [
    {
      id: 'new-patient',
      title: t('newPatient'),
      description: t('quickActions.addPatient'),
      icon: UserPlus,
      color: 'green',
      action: () => setActiveModule('patients')
    },
    {
      id: 'new-appointment',
      title: t('newAppointment'),
      description: t('quickActions.planConsultation'),
      icon: CalendarPlus,
      color: 'blue',
      action: () => setActiveModule('appointments')
    },
    {
      id: 'new-consultation',
      title: t('newConsultation'),
      description: t('quickActions.createRecord'),
      icon: Plus,
      color: 'purple',
      action: () => setActiveModule('medical-records')
    }
  ];

  const medicalInsights = [
    {
      title: t('dailyAppointments'),
      value: '0',
      subtitle: t('insights.noConsultations'),
      icon: Calendar,
      color: 'blue'
    },
    {
      title: t('patientsWaiting'),
      value: '0',
      subtitle: t('insights.emptyWaitingRoom'),
      icon: Clock,
      color: 'orange'
    },
    {
      title: t('emergencies'),
      value: '0',
      subtitle: t('insights.noAlerts'),
      icon: AlertCircle,
      color: 'red'
    }
  ];

  const onboardingSteps = [
    {
      step: 1,
      title: t('configureClinic'),
      description: t('onboarding.clinicInfo'),
      completed: Boolean(user?.companyName),
      action: () => setActiveModule('settings')
    },
    {
      step: 2,
      title: t('addPatients'),
      description: t('onboarding.addPatients'),
      completed: stats.patients > 0,
      action: () => setActiveModule('patients')
    },
    {
      step: 3,
      title: t('planConsultations'),
      description: t('onboarding.planConsultations'),
      completed: stats.appointments > 0,
      action: () => setActiveModule('appointments')
    },
    {
      step: 4,
      title: t('createFirstRecord'),
      description: t('onboarding.createRecord'),
      completed: stats.consultations > 0,
      action: () => setActiveModule('medical-records')
    }
  ];

  const completedSteps = onboardingSteps.filter(step => step.completed).length;
  const progress = (completedSteps / onboardingSteps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Accueil personnalisé */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {t('welcome', { name: user?.name?.split(' ')[0] || 'Doctor' })}
            </h1>
            <p className="text-green-100 mb-4">
              {t('welcomeSubtitle')}
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <Heart className="h-4 w-4 mr-1" />
                {t('clinic')}: {user?.companyName || t('toSetup')}
              </div>
              <div className="flex items-center">
                <Activity className="h-4 w-4 mr-1" />
                ClinicManager Pro
              </div>
            </div>
          </div>
          <div className="text-right">
            <Stethoscope className="h-16 w-16 text-green-200 mb-2" />
            <div className="text-sm text-green-100">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques médicales rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('totalPatients')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.patients}</p>
            </div>
            <Users className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('appointmentsMonth')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.appointments}</p>
            </div>
            <Calendar className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('consultations')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.consultations}</p>
            </div>
            <FileText className="h-10 w-10 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('pending')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
            <Clipboard className="h-10 w-10 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Aperçu médical du jour */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {medicalInsights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                <Icon className={`h-6 w-6 text-${insight.color}-600`} />
              </div>
              <div className="mb-2">
                <span className="text-2xl font-bold text-gray-900">{insight.value}</span>
              </div>
              <p className="text-sm text-gray-500">{insight.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('quickActionsTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 bg-${action.color}-100 rounded-lg`}>
                    <Icon className={`h-6 w-6 text-${action.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-gray-700">
                      {action.title}
                    </h4>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fiches patients à compléter */}
      {incompletePatients.length > 0 && (
        <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-orange-900">
                  {t('incompletePatients.title')}
                </h3>
                <p className="text-sm text-orange-700">
                  {t('incompletePatients.description', { count: incompletePatients.length })}
                </p>
              </div>
            </div>
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
              {incompletePatients.length}
            </span>
          </div>

          <div className="space-y-2">
            {incompletePatients.slice(0, 5).map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-3 bg-white border border-orange-100 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <Users className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {patient.email || patient.phone || t('noContact')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModule('patients')}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors text-sm font-medium"
                  title={t('completeProfile')}
                >
                  <Edit2 className="h-4 w-4" />
                  <span>{t('complete')}</span>
                </button>
              </div>
            ))}
          </div>

          {incompletePatients.length > 5 && (
            <button
              onClick={() => setActiveModule('patients')}
              className="w-full mt-3 px-4 py-2 text-orange-700 hover:bg-orange-100 rounded-lg transition-colors font-medium text-sm"
            >
              {t('incompletePatients.seeMore', { count: incompletePatients.length - 5 })}
            </button>
          )}
        </div>
      )}

      {/* Configuration initiale */}
      {completedSteps < onboardingSteps.length && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('clinicConfiguration')}
            </h3>
            <div className="text-sm text-gray-500">
              {completedSteps}/{onboardingSteps.length} {t('steps')}
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-3">
            {onboardingSteps.map((step) => (
              <div
                key={step.step}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  step.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step.completed ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step.completed ? '✓' : step.step}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
                {!step.completed && (
                  <button
                    onClick={step.action}
                    className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center"
                  >
                    {t('start')} <ArrowRight className="h-4 w-4 ml-1" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informations conformité médicale */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Heart className="h-6 w-6 text-green-600 mt-1" />
          <div>
            <h4 className="font-semibold text-green-800 mb-2">
              {t('medicalCompliance')}
            </h4>
            <p className="text-green-700 text-sm mb-3">
              {t('complianceDescription')}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ {t('compliance.medicalSecret')}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ {t('compliance.gdpr')}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ {t('compliance.auditTrail')}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ {t('compliance.secureBackup')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeModule;