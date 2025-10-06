// components/auth/SocialAuth.js
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const SocialAuth = ({ isLoading, setIsLoading, mode = 'login' }) => {
  const { login } = useAuth();

  // Authentification Google Business
  const handleGoogleLogin = async () => {
    if (typeof setIsLoading === 'function') {
      setIsLoading(true);
    }
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const userData = {
        id: 'google_' + Date.now(),
        email: 'john@entreprise.fr',
        name: 'John Doe',
        companyName: 'Entreprise SARL',
        provider: 'google',
        avatar: '👨‍💼',
        plan: 'free'
      };
      login(userData);
      alert('✅ Connexion Google Business réussie !');
    } catch (error) {
      alert('❌ Erreur de connexion Google');
    } finally {
      if (typeof setIsLoading === 'function') {
        setIsLoading(false);
      }
    }
  };

  // Authentification Microsoft
  const handleMicrosoftLogin = async () => {
    if (typeof setIsLoading === 'function') {
      setIsLoading(true);
    }
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const userData = {
        id: 'microsoft_' + Date.now(),
        email: 'marie@monbusiness.com',
        name: 'Marie Martin',
        companyName: 'Mon Business',
        provider: 'microsoft',
        avatar: '👩‍💼',
        plan: 'free'
      };
      login(userData);
      alert('✅ Connexion Microsoft réussie !');
    } catch (error) {
      alert('❌ Erreur de connexion Microsoft');
    } finally {
      if (typeof setIsLoading === 'function') {
        setIsLoading(false);
      }
    }
  };

  const loginText = mode === 'signup' ? 'S\'inscrire avec' : 'Continuer avec';

  return (
    <div className="space-y-3">
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <div className="w-5 h-5 mr-3 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">
          G
        </div>
        {loginText} Google Business
      </button>
      
      <button
        onClick={handleMicrosoftLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <div className="w-5 h-5 mr-3 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">
          M
        </div>
        {loginText} Microsoft
      </button>
    </div>
  );
};

export default SocialAuth;