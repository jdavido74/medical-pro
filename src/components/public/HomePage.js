// components/public/HomePage.js
import React from 'react';
import {
  Heart, Users, Calendar, FileText, Shield, Check, ArrowRight,
  Stethoscope, Activity, UserCheck, ClipboardList, Lock, Zap
} from 'lucide-react';

const HomePage = ({ setCurrentPage }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">ClinicManager</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentPage('login')}
                className="text-gray-600 hover:text-green-600 transition-colors"
              >
                Connexion
              </button>
              <button
                onClick={() => setCurrentPage('signup')}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Essai gratuit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Gestion médicale
            <span className="text-green-600 block">nouvelle génération</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Solution complète pour praticiens et établissements de santé.
            Gestion des patients, rendez-vous, dossiers médicaux et documents conformes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => setCurrentPage('signup')}
              className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button className="border border-green-600 text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-50 transition-colors">
              Voir la démo
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Users className="h-10 w-10 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-3">Gestion des Patients</h3>
              <p className="text-gray-600 text-sm">
                Dossiers complets, antécédents, traitements et suivi personnalisé
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Calendar className="h-10 w-10 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-3">Planning Intelligent</h3>
              <p className="text-gray-600 text-sm">
                Prise de rendez-vous, rappels automatiques et optimisation des créneaux
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <FileText className="h-10 w-10 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-3">Dossiers Médicaux</h3>
              <p className="text-gray-600 text-sm">
                Consultations, diagnostics, prescriptions et documents conformes
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Shield className="h-10 w-10 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-3">Sécurité RGPD</h3>
              <p className="text-gray-600 text-sm">
                Protection des données de santé et conformité réglementaire
              </p>
            </div>
          </div>

          {/* Medical Specialties */}
          <div className="bg-white rounded-2xl p-12 shadow-xl mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-8">Adapté à votre pratique médicale</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <Stethoscope className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">Médecine Générale</h4>
                <p className="text-gray-600">
                  Consultation, suivi patients, ordonnances et certificats médicaux
                </p>
              </div>
              <div className="text-center">
                <Activity className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">Spécialistes</h4>
                <p className="text-gray-600">
                  Cardiologie, dermatologie, orthopédie... Adaptable à toute spécialité
                </p>
              </div>
              <div className="text-center">
                <UserCheck className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">Cliniques & Hôpitaux</h4>
                <p className="text-gray-600">
                  Multi-praticiens, gestion centralisée, workflow optimisé
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-12 shadow-xl text-white">
            <h3 className="text-3xl font-bold mb-8">Pourquoi choisir ClinicManager ?</h3>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Conformité médicale</h4>
                    <p className="text-green-100">Secret médical, RGPD santé, validation FINESS/ADELI</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Lock className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Sécurité maximale</h4>
                    <p className="text-green-100">Chiffrement, accès contrôlés, audit trail complet</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <ClipboardList className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Interface médicale</h4>
                    <p className="text-green-100">Pensée par et pour les professionnels de santé</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Zap className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Workflow optimisé</h4>
                    <p className="text-green-100">Gain de temps, automatisation des tâches administratives</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Heart className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Support médical</h4>
                    <p className="text-green-100">Équipe connaissant le secteur de la santé</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Prix transparent</h4>
                    <p className="text-green-100">Tarif dégressif selon taille du cabinet, essai 30 jours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Final */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Prêt à moderniser votre pratique médicale ?
            </h3>
            <p className="text-gray-600 mb-8">
              Rejoignez les centaines de praticiens qui nous font déjà confiance
            </p>
            <button
              onClick={() => setCurrentPage('signup')}
              className="bg-green-600 text-white px-12 py-4 rounded-lg text-xl font-semibold hover:bg-green-700 transition-colors inline-flex items-center"
            >
              Démarrer mon essai gratuit
              <ArrowRight className="ml-3 h-6 w-6" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-8 w-8 text-green-400" />
                <h3 className="text-xl font-bold">ClinicManager</h3>
              </div>
              <p className="text-gray-400">
                La solution de gestion médicale pensée pour les professionnels de santé.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Fonctionnalités</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-white transition-colors">Gestion patients</button></li>
                <li><button className="hover:text-white transition-colors">Planning médical</button></li>
                <li><button className="hover:text-white transition-colors">Dossiers médicaux</button></li>
                <li><button className="hover:text-white transition-colors">Documents conformes</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-white transition-colors">Centre d'aide</button></li>
                <li><button className="hover:text-white transition-colors">Formation</button></li>
                <li><button className="hover:text-white transition-colors">Contact médical</button></li>
                <li><button className="hover:text-white transition-colors">Conformité RGPD</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-white transition-colors">CGU Santé</button></li>
                <li><button className="hover:text-white transition-colors">Charte données</button></li>
                <li><button className="hover:text-white transition-colors">Secret médical</button></li>
                <li><button className="hover:text-white transition-colors">Mentions légales</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ClinicManager. Tous droits réservés. | Solution de gestion médicale conforme RGPD santé</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;