// App.test.js - Smoke test for the application
import React from 'react';
import { render, screen } from '@testing-library/react';

// The react-router-dom mock is automatically loaded from src/__mocks__/react-router-dom.js

// Mock the contexts and components that have external dependencies
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn()
  })
}));

jest.mock('./contexts/DynamicTranslationsContext', () => ({
  DynamicTranslationsProvider: ({ children }) => <div data-testid="translations-provider">{children}</div>
}));

jest.mock('./contexts/MedicalModulesContext', () => ({
  MedicalModulesProvider: ({ children }) => <div data-testid="medical-modules-provider">{children}</div>
}));

jest.mock('./contexts/PatientContext', () => ({
  PatientProvider: ({ children }) => <div data-testid="patient-provider">{children}</div>
}));

jest.mock('./contexts/AppointmentContext', () => ({
  AppointmentProvider: ({ children }) => <div data-testid="appointment-provider">{children}</div>
}));

jest.mock('./components/ClinicStatusGuard', () => ({ children }) => (
  <div data-testid="clinic-status-guard">{children}</div>
));

jest.mock('./utils/regionDetector', () => ({
  detectRegion: () => 'france',
  getRegionConfig: () => ({
    name: 'France',
    currency: 'EUR',
    locale: 'fr-FR'
  })
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'fr', changeLanguage: jest.fn() }
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}));

// Mock routes
jest.mock('./routes', () => []);

// Import App after all mocks are set up
import App from './App';

describe('App Component', () => {
  beforeEach(() => {
    // Clear console errors/warnings for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('browser-router')).toBeInTheDocument();
  });

  it('renders all required providers', () => {
    render(<App />);

    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('translations-provider')).toBeInTheDocument();
    expect(screen.getByTestId('medical-modules-provider')).toBeInTheDocument();
    expect(screen.getByTestId('patient-provider')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-provider')).toBeInTheDocument();
  });

  it('renders clinic status guard', () => {
    render(<App />);
    expect(screen.getByTestId('clinic-status-guard')).toBeInTheDocument();
  });

  it('renders routes component', () => {
    render(<App />);
    expect(screen.getByTestId('use-routes')).toBeInTheDocument();
  });
});
