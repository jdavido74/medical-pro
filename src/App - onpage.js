import React, { useState, useContext, createContext } from 'react';
import { 
  Shield, FileText, Users, Check, ArrowRight, Building2, Eye, EyeOff, 
  Lock, Mail, Home, UserPlus, Settings, LogOut, Plus, Search,
  BarChart3, FileCheck, Calendar, Bell
} from 'lucide-react';

// Context pour la gestion d'état global
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Composant principal
const FactureProApp = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  
  // Si l'utilisateur est connecté, afficher le dashboard
  if (isAuthenticated) {
    return <Dashboard currentPage={currentPage} setCurrentPage={setCurrentPage} />;
  }
  
  // Sinon, afficher les pages publiques
  return <PublicPages currentPage={currentPage} setCurrentPage={setCurrentPage} />;
};

// Pages publiques (accueil, connexion, inscription)
const PublicPages = ({ currentPage, setCurrentPage }) => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  
  // États pour l'inscription
  const [signupData, setSignupData] = useState({
    email: '', password: '', confirmPassword: '', companyName: '',
    siret: '', address: '', postalCode: '', city: '', legalStatus: '', acceptTerms: false
  });
  
  // États pour la connexion
  const [loginData, setLoginData] = useState({
    email: '', password: '', rememberMe: false, enable2FA: false
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Validation email
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateSiret = (siret) => /^\d{14}$/.test(siret);

  // Gestion changements
  const handleSignupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSignupData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleLoginChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLoginData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Authentification sociale - Google Business
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Simulation données Google Business
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
      setIsLoading(false);
    }
  };

  // Authentification sociale - Microsoft
  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Simulation données Microsoft/Office 365
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
      setIsLoading(false);
    }
  };

  // Connexion classique
  const handleClassicLogin = async () => {
    if (!loginData.email || !loginData.password) {
      setErrors({ email: 'Email requis', password: 'Mot de passe requis' });
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (loginData.email === 'test@exemple.fr' && loginData.password === 'motdepasse123') {
        const userData = {
          id: 'classic_' + Date.now(),
          email: loginData.email,
          name: 'Utilisateur Test',
          companyName: 'Entreprise Test',
          provider: 'classic',
          avatar: '🏢',
          plan: 'premium'
        };
        login(userData);
        alert('✅ Connexion classique réussie !');
      } else {
        setErrors({ email: 'Identifiants incorrects', password: 'Vérifiez vos données' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Inscription
  const handleSignupSubmit = async () => {
    const newErrors = {};
    if (!signupData.email || !validateEmail(signupData.email)) newErrors.email = 'Email invalide';
    if (!signupData.password || signupData.password.length < 8) newErrors.password = 'Minimum 8 caractères';
    if (signupData.password !== signupData.confirmPassword) newErrors.confirmPassword = 'Mots de passe différents';
    if (!signupData.companyName) newErrors.companyName = 'Nom entreprise requis';
    if (!signupData.siret || !validateSiret(signupData.siret)) newErrors.siret = 'SIRET invalide';
    if (!signupData.acceptTerms) newErrors.acceptTerms = 'Acceptation requise';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('✅ Compte créé ! Email de confirmation envoyé.');
      setCurrentPage('login');
    } finally {
      setIsLoading(false);
    }
  };

  // PAGE DE CONNEXION HYBRIDE
  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="text-center mb-8">
              <Building2 className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900">Connexion</h1>
              <p className="text-gray-600 mt-2">Accédez à votre espace FacturePro</p>
            </div>

            {/* Authentification sociale */}
            <div className="space-y-4 mb-6">
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <div className="w-5 h-5 mr-3 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">G</div>
                Continuer avec Google Business
              </button>
              
              <button
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <div className="w-5 h-5 mr-3 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">M</div>
                Continuer avec Microsoft
              </button>
            </div>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm text-gray-500">ou par email</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Connexion classique */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="votre@email.fr"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Votre mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={loginData.rememberMe}
                  onChange={handleLoginChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Se souvenir de moi</label>
              </div>

              <button
                onClick={handleClassicLogin}
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>

            <div className="text-center mt-6 space-y-3">
              <button className="text-indigo-600 hover:text-indigo-700 text-sm">
                Mot de passe oublié ?
              </button>
              
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">
                  Pas encore de compte ?{' '}
                  <button
                    onClick={() => setCurrentPage('signup')}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Créer un compte
                  </button>
                </p>
              </div>
            </div>

            <div className="text-center mt-4">
              <button
                onClick={() => setCurrentPage('home')}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← Retour à l'accueil
              </button>
            </div>

            {/* Info démo */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800 text-center">
                <strong>🧪 Mode démo :</strong> test@exemple.fr / motdepasse123
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PAGE D'INSCRIPTION (simplifiée)
  if (currentPage === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="text-center mb-8">
              <Building2 className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900">Créer votre compte</h1>
            </div>

            {/* Buttons sociaux */}
            <div className="space-y-3 mb-6">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-5 h-5 mr-3 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">G</div>
                S'inscrire avec Google Business
              </button>
              
              <button
                onClick={handleMicrosoftLogin}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-5 h-5 mr-3 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">M</div>
                S'inscrire avec Microsoft
              </button>
            </div>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm text-gray-500">ou par email</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Formulaire classique simplifié */}
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="email"
                  name="email"
                  value={signupData.email}
                  onChange={handleSignupChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Email professionnel"
                />
                <input
                  type="text"
                  name="companyName"
                  value={signupData.companyName}
                  onChange={handleSignupChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Nom de l'entreprise"
                />
              </div>
              
              <input
                type="text"
                name="siret"
                value={signupData.siret}
                onChange={handleSignupChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="SIRET (14 chiffres)"
                maxLength="14"
              />
              
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="password"
                  name="password"
                  value={signupData.password}
                  onChange={handleSignupChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Mot de passe (8+ caractères)"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  value={signupData.confirmPassword}
                  onChange={handleSignupChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Confirmer mot de passe"
                />
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={signupData.acceptTerms}
                  onChange={handleSignupChange}
                  className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label className="ml-3 text-sm text-gray-600">
                  J'accepte les conditions générales et la politique de confidentialité
                </label>
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  {Object.values(errors).map((error, index) => (
                    <p key={index} className="text-red-600 text-sm">{error}</p>
                  ))}
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentPage('home')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Retour
                </button>
                <button
                  onClick={handleSignupSubmit}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Création...' : 'Créer mon compte'}
                </button>
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Déjà un compte ?{' '}
                  <button
                    onClick={() => setCurrentPage('login')}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Se connecter
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PAGE D'ACCUEIL
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">FacturePro</h1>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => setCurrentPage('login')}
                className="text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Connexion
              </button>
              <button
                onClick={() => setCurrentPage('signup')}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Essai gratuit
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Facturation électronique
            <span className="text-indigo-600 block">conforme 2026</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Connectez-vous avec Google Business, Microsoft ou créez un compte classique. 
            Simplicité et sécurité pour vos factures électroniques.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => setCurrentPage('signup')}
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button className="border border-indigo-600 text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-50 transition-colors">
              Voir la démo
            </button>
          </div>

          {/* Features avec nouveauté auth sociale */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <Shield className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Connexion sécurisée</h3>
              <p className="text-gray-600">
                Google Business, Microsoft ou email classique. Authentification 2FA disponible.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <FileText className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">100% Conforme 2026</h3>
              <p className="text-gray-600">
                Respect de la réglementation européenne EN 16931 pour la facturation électronique
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <Users className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Multi-clients</h3>
              <p className="text-gray-600">
                Gestion illimitée de clients avec patterns de numérotation personnalisés
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// DASHBOARD PRINCIPAL
const Dashboard = ({ currentPage, setCurrentPage }) => {
  const { user, logout } = useAuth();
  const [activeModule, setActiveModule] = useState('home');

  const handleLogout = () => {
    logout();
    setCurrentPage('home');
  };

  const menuItems = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'invoices', label: 'Factures', icon: FileText },
    { id: 'quotes', label: 'Devis', icon: FileCheck },
    { id: 'analytics', label: 'Statistiques', icon: BarChart3 },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">FacturePro</h1>
          </div>
          <div className="mt-4 flex items-center space-x-3">
            <div className="text-2xl">{user?.avatar}</div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.companyName}</p>
              <span className={`text-xs px-2 py-1 rounded-full ${
                user?.plan === 'premium' ? 'bg-gold-100 text-gold-800' : 'bg-green-100 text-green-800'
              }`}>
                {user?.plan === 'premium' ? '👑 Premium' : '🆓 Gratuit'}
              </span>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveModule(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeModule === item.id
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header du dashboard */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {menuItems.find(item => item.id === activeModule)?.label || 'Accueil'}
              </h2>
              <p className="text-sm text-gray-600">
                Connecté via {user?.provider === 'google' ? 'Google Business' : 
                            user?.provider === 'microsoft' ? 'Microsoft' : 'Email'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Bell className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer" />
              <div className="text-sm text-gray-600">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 p-6">
          <DashboardContent activeModule={activeModule} user={user} />
        </main>
      </div>
    </div>
  );
};

// Contenu du dashboard selon le module actif
const DashboardContent = ({ activeModule, user }) => {
  if (activeModule === 'home') {
    return (
      <div className="space-y-8">
        {/* Bienvenue */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-8 text-white">
          <h3 className="text-3xl font-bold mb-2">Bienvenue {user?.name} ! 👋</h3>
          <p className="text-indigo-100 mb-4">
            Votre espace FacturePro est prêt. Commencez par ajouter vos premiers clients !
          </p>
          <div className="flex space-x-4">
            <button className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors">
              Créer ma première facture
            </button>
            <button className="border border-white text-white px-6 py-2 rounded-lg font-semibold hover:bg-white hover:text-indigo-600 transition-colors">
              Ajouter un client
            </button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clients</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">+0 ce mois</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Factures</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">+0 ce mois</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chiffre d'affaires</p>
                <p className="text-3xl font-bold text-gray-900">0€</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">+0% ce mois</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En attente</p>
                <p className="text-3xl font-bold text-gray-900">0€</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">À encaisser</p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h4>
            <div className="space-y-3">
              <button className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors">
                <Plus className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="font-medium text-gray-900">Nouvelle facture</p>
                  <p className="text-sm text-gray-500">Créer une facture conforme 2026</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors">
                <UserPlus className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Ajouter un client</p>
                  <p className="text-sm text-gray-500">Nouveau client à votre portefeuille</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors">
                <FileCheck className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Créer un devis</p>
                  <p className="text-sm text-gray-500">Proposition commerciale</p>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h4>
            <div className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>Aucune activité récente</p>
                <p className="text-sm">Commencez par créer votre première facture !</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guide de démarrage */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">🚀 Guide de démarrage</h4>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-indigo-600 font-bold">1</span>
              </div>
              <h5 className="font-medium text-gray-900 mb-2">Configurez votre profil</h5>
              <p className="text-sm text-gray-600">Complétez les informations de votre entreprise</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h5 className="font-medium text-gray-900 mb-2">Ajoutez vos clients</h5>
              <p className="text-sm text-gray-600">Importez ou saisissez vos contacts clients</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h5 className="font-medium text-gray-900 mb-2">Créez vos factures</h5>
              <p className="text-sm text-gray-600">Générez des factures conformes à la norme 2026</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeModule === 'clients') {
    return (
      <div className="space-y-6">
        {/* Header section clients */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Gestion des clients</h3>
            <p className="text-gray-600">Gérez votre portefeuille client</p>
          </div>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nouveau client</span>
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Filtrer
            </button>
          </div>
        </div>

        {/* Liste des clients (vide pour l'instant) */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h4 className="font-semibold text-gray-900">Liste des clients</h4>
          </div>
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h5 className="text-lg font-medium text-gray-900 mb-2">Aucun client pour l'instant</h5>
            <p className="text-gray-600 mb-6">Commencez par ajouter votre premier client</p>
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
              Ajouter un client
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeModule === 'invoices') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Factures</h3>
            <p className="text-gray-600">Gestion de vos factures conformes 2026</p>
          </div>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nouvelle facture</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h4 className="font-semibold text-gray-900">Factures récentes</h4>
          </div>
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h5 className="text-lg font-medium text-gray-900 mb-2">Aucune facture créée</h5>
            <p className="text-gray-600 mb-6">Créez votre première facture conforme à la réglementation 2026</p>
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
              Créer une facture
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeModule === 'settings') {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900">Paramètres</h3>
        
        <div className="grid gap-6">
          {/* Profil entreprise */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Profil entreprise</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
                <input
                  type="text"
                  value={user?.companyName || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  readOnly
                />
              </div>
            </div>
            <div className="mt-4">
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                Modifier le profil
              </button>
            </div>
          </div>

          {/* Sécurité */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Sécurité</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Authentification à deux facteurs</p>
                  <p className="text-sm text-gray-600">Sécurisez votre compte avec la 2FA</p>
                </div>
                <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
                  Activer
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Changer le mot de passe</p>
                  <p className="text-sm text-gray-600">Modifiez votre mot de passe régulièrement</p>
                </div>
                <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors">
                  Modifier
                </button>
              </div>
            </div>
          </div>

          {/* Plan d'abonnement */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Plan d'abonnement</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  Plan {user?.plan === 'premium' ? 'Premium' : 'Gratuit'}
                  {user?.plan === 'premium' && <span className="ml-2">👑</span>}
                </p>
                <p className="text-sm text-gray-600">
                  {user?.plan === 'premium' ? 
                    'Accès à toutes les fonctionnalités' : 
                    'Limité à 5 factures par mois'
                  }
                </p>
              </div>
              {user?.plan !== 'premium' && (
                <button className="bg-gold-600 text-white px-4 py-2 rounded-lg hover:bg-gold-700 transition-colors">
                  Passer au Premium
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Module par défaut
  return (
    <div className="text-center py-12">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Module en développement</h3>
      <p className="text-gray-600">Cette fonctionnalité sera disponible prochainement.</p>
    </div>
  );
};

export default FactureProApp;