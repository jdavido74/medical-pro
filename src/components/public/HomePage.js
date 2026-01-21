// components/public/HomePage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart, Users, Calendar, FileText, Shield, Check, ArrowRight,
  Stethoscope, Activity, UserCheck, ClipboardList, Lock, Zap
} from 'lucide-react';

const HomePage = () => {
  const { t } = useTranslation('public');
  const navigate = useNavigate();
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
                onClick={() => navigate('/login')}
                className="text-gray-600 hover:text-green-600 transition-colors"
              >
                {t('loginButton')}
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('trialButton')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            {t('mainTitle')}
            <span className="text-green-600 block">{t('mainTitleSub')}</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            {t('mainDescription')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => navigate('/signup')}
              className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              {t('startFree')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button className="border border-green-600 text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-50 transition-colors">
              {t('seeDemo')}
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Users className="h-10 w-10 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-3">{t('featurePatients')}</h3>
              <p className="text-gray-600 text-sm">
                {t('featurePatientsDesc')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Calendar className="h-10 w-10 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-3">{t('featureAppointments')}</h3>
              <p className="text-gray-600 text-sm">
                {t('featureAppointmentsDesc')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <FileText className="h-10 w-10 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-3">{t('featureMedical')}</h3>
              <p className="text-gray-600 text-sm">
                {t('featureMedicalDesc')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Shield className="h-10 w-10 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-3">{t('featureSecurity')}</h3>
              <p className="text-gray-600 text-sm">
                {t('featureSecurityDesc')}
              </p>
            </div>
          </div>

          {/* Medical Specialties */}
          <div className="bg-white rounded-2xl p-12 shadow-xl mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-8">{t('adaptedTitle')}</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <Stethoscope className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">{t('specialtyGP')}</h4>
                <p className="text-gray-600">
                  {t('specialtyGPDesc')}
                </p>
              </div>
              <div className="text-center">
                <Activity className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">{t('specialtySpecialists')}</h4>
                <p className="text-gray-600">
                  {t('specialtySpecialistsDesc')}
                </p>
              </div>
              <div className="text-center">
                <UserCheck className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">{t('specialtyClinics')}</h4>
                <p className="text-gray-600">
                  {t('specialtyClinicsDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-12 shadow-xl text-white">
            <h3 className="text-3xl font-bold mb-8">{t('whyChoose')}</h3>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">{t('benefitCompliance')}</h4>
                    <p className="text-green-100">{t('benefitComplianceDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Lock className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">{t('benefitSecurity')}</h4>
                    <p className="text-green-100">{t('benefitSecurityDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <ClipboardList className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">{t('benefitInterface')}</h4>
                    <p className="text-green-100">{t('benefitInterfaceDesc')}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Zap className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">{t('benefitWorkflow')}</h4>
                    <p className="text-green-100">{t('benefitWorkflowDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Heart className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">{t('benefitSupport')}</h4>
                    <p className="text-green-100">{t('benefitSupportDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-green-300 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">{t('benefitPricing')}</h4>
                    <p className="text-green-100">{t('benefitPricingDesc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Final */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {t('ctaTitle')}
            </h3>
            <p className="text-gray-600 mb-8">
              {t('ctaDescription')}
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="bg-green-600 text-white px-12 py-4 rounded-lg text-xl font-semibold hover:bg-green-700 transition-colors inline-flex items-center"
            >
              {t('ctaButton')}
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
                {t('footerDescription')}
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">{t('footerFeatures')}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-white transition-colors">{t('footerPatients')}</button></li>
                <li><button className="hover:text-white transition-colors">{t('footerPlanning')}</button></li>
                <li><button className="hover:text-white transition-colors">{t('footerMedical')}</button></li>
                <li><button className="hover:text-white transition-colors">{t('footerDocuments')}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">{t('footerSupport')}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-white transition-colors">{t('footerHelp')}</button></li>
                <li><button className="hover:text-white transition-colors">{t('footerTraining')}</button></li>
                <li><button className="hover:text-white transition-colors">{t('footerContact')}</button></li>
                <li><button className="hover:text-white transition-colors">{t('footerCompliance')}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">{t('footerLegal')}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-white transition-colors">{t('footerTerms')}</button></li>
                <li><button className="hover:text-white transition-colors">{t('footerCharter')}</button></li>
                <li><button className="hover:text-white transition-colors">{t('footerSecret')}</button></li>
                <li><button className="hover:text-white transition-colors">{t('footerLegal')}</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ClinicManager. {t('footerCopyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;