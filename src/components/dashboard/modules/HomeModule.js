// components/dashboard/modules/HomeModule.js
import React from 'react';
import {
  Users, Calendar, FileText, Heart, Plus, UserPlus,
  CalendarPlus, ArrowRight, Activity, Stethoscope,
  Clipboard, Clock, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const HomeModule = ({ setActiveModule }) => {
  const { user } = useAuth();

  // Données simulées - seront remplacées par les vraies données depuis la base
  const stats = {
    patients: 0,
    appointments: 0,
    consultations: 0,
    pending: 0
  };

  const quickActions = [
    {
      id: 'new-patient',
      title: 'Nouveau patient',
      description: 'Ajouter un patient à votre cabinet',
      icon: UserPlus,
      color: 'green',
      action: () => setActiveModule('patients')
    },
    {
      id: 'new-appointment',
      title: 'Prendre rendez-vous',
      description: 'Planifier une consultation',
      icon: CalendarPlus,
      color: 'blue',
      action: () => setActiveModule('appointments')
    },
    {
      id: 'new-consultation',
      title: 'Nouvelle consultation',
      description: 'Créer un dossier médical',
      icon: Plus,
      color: 'purple',
      action: () => setActiveModule('medical-records')
    }
  ];

  const medicalInsights = [
    {
      title: 'Rendez-vous du jour',
      value: '0',
      subtitle: 'Aucune consultation prévue',
      icon: Calendar,
      color: 'blue'
    },
    {
      title: 'Patients en attente',
      value: '0',
      subtitle: 'Salle d\'attente vide',
      icon: Clock,
      color: 'orange'
    },
    {
      title: 'Urgences signalées',
      value: '0',
      subtitle: 'Aucune alerte active',
      icon: AlertCircle,
      color: 'red'
    }
  ];

  const onboardingSteps = [
    {
      step: 1,
      title: 'Configurez votre cabinet',
      description: 'Informations professionnelles et coordonnées',
      completed: Boolean(user?.companyName),
      action: () => setActiveModule('settings')
    },
    {
      step: 2,
      title: 'Ajoutez vos premiers patients',
      description: 'Créez votre patientèle dans ClinicManager',
      completed: stats.patients > 0,
      action: () => setActiveModule('patients')
    },
    {
      step: 3,
      title: 'Planifiez vos consultations',
      description: 'Organisez votre planning médical',
      completed: stats.appointments > 0,
      action: () => setActiveModule('appointments')
    },
    {
      step: 4,
      title: 'Créez votre premier dossier',
      description: 'Consultations et prescriptions',
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
              Bonjour Dr {user?.name?.split(' ')[0] || 'Docteur'} 👋
            </h1>
            <p className="text-green-100 mb-4">
              Bienvenue dans votre cabinet médical numérique
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <Heart className="h-4 w-4 mr-1" />
                Cabinet: {user?.companyName || 'À configurer'}
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
              {new Date().toLocaleDateString('fr-FR', {
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
              <p className="text-sm text-gray-600 mb-1">Patients total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.patients}</p>
            </div>
            <Users className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">RDV ce mois</p>
              <p className="text-2xl font-bold text-gray-900">{stats.appointments}</p>
            </div>
            <Calendar className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Consultations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.consultations}</p>
            </div>
            <FileText className="h-10 w-10 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">En attente</p>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
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

      {/* Configuration initiale */}
      {completedSteps < onboardingSteps.length && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Configuration de votre cabinet
            </h3>
            <div className="text-sm text-gray-500">
              {completedSteps}/{onboardingSteps.length} étapes
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
                    Commencer <ArrowRight className="h-4 w-4 ml-1" />
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
              Cabinet médical sécurisé et conforme
            </h4>
            <p className="text-green-700 text-sm mb-3">
              ClinicManager respecte le secret médical, la protection des données de santé (RGPD)
              et s'adapte aux exigences professionnelles des praticiens.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Secret médical
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ RGPD Santé
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Audit trail
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Sauvegarde sécurisée
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeModule;