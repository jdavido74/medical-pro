/**
 * ConsentSigningPage - Public page for signing consent documents
 *
 * This page is accessed via a secure token from email or tablet link.
 * No authentication required - security is handled via the signing token.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Loader,
  RefreshCw
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

// Translations
const translations = {
  fr: {
    loading: 'Chargement du document...',
    expired: 'Ce lien a expiré',
    expiredMessage: 'La demande de signature a expiré. Veuillez contacter la clinique pour recevoir un nouveau lien.',
    alreadySigned: 'Document déjà signé',
    alreadySignedMessage: 'Ce consentement a déjà été signé. Vous pouvez fermer cette page.',
    invalid: 'Lien invalide',
    invalidMessage: 'Ce lien de signature n\'est pas valide ou n\'existe pas.',
    error: 'Une erreur est survenue',
    documentToSign: 'Document à signer',
    expiresOn: 'Expire le',
    hello: 'Bonjour',
    readCarefully: 'Veuillez lire attentivement le document ci-dessous avant de signer.',
    messageFromClinic: 'Message de la clinique',
    iAgree: 'J\'accepte les termes du document ci-dessus',
    signBelow: 'Signez ci-dessous',
    signatureInstructions: 'Utilisez votre doigt ou votre souris pour signer',
    clear: 'Effacer',
    signDocument: 'Signer le document',
    signing: 'Signature en cours...',
    success: 'Document signé avec succès !',
    successMessage: 'Votre signature a été enregistrée. Vous pouvez fermer cette page.',
    closeWindow: 'Fermer',
    signatureRequired: 'Veuillez dessiner votre signature',
    acceptRequired: 'Veuillez accepter les termes du document',
    retry: 'Réessayer'
  },
  en: {
    loading: 'Loading document...',
    expired: 'This link has expired',
    expiredMessage: 'The signature request has expired. Please contact the clinic for a new link.',
    alreadySigned: 'Document already signed',
    alreadySignedMessage: 'This consent has already been signed. You can close this page.',
    invalid: 'Invalid link',
    invalidMessage: 'This signature link is invalid or does not exist.',
    error: 'An error occurred',
    documentToSign: 'Document to sign',
    expiresOn: 'Expires on',
    hello: 'Hello',
    readCarefully: 'Please read the document below carefully before signing.',
    messageFromClinic: 'Message from the clinic',
    iAgree: 'I agree to the terms of the document above',
    signBelow: 'Sign below',
    signatureInstructions: 'Use your finger or mouse to sign',
    clear: 'Clear',
    signDocument: 'Sign document',
    signing: 'Signing...',
    success: 'Document signed successfully!',
    successMessage: 'Your signature has been recorded. You can close this page.',
    closeWindow: 'Close',
    signatureRequired: 'Please draw your signature',
    acceptRequired: 'Please accept the document terms',
    retry: 'Retry'
  },
  es: {
    loading: 'Cargando documento...',
    expired: 'Este enlace ha expirado',
    expiredMessage: 'La solicitud de firma ha expirado. Por favor contacte la clínica para un nuevo enlace.',
    alreadySigned: 'Documento ya firmado',
    alreadySignedMessage: 'Este consentimiento ya ha sido firmado. Puede cerrar esta página.',
    invalid: 'Enlace inválido',
    invalidMessage: 'Este enlace de firma no es válido o no existe.',
    error: 'Ocurrió un error',
    documentToSign: 'Documento para firmar',
    expiresOn: 'Expira el',
    hello: 'Hola',
    readCarefully: 'Por favor lea el documento a continuación cuidadosamente antes de firmar.',
    messageFromClinic: 'Mensaje de la clínica',
    iAgree: 'Acepto los términos del documento anterior',
    signBelow: 'Firme abajo',
    signatureInstructions: 'Use su dedo o ratón para firmar',
    clear: 'Borrar',
    signDocument: 'Firmar documento',
    signing: 'Firmando...',
    success: '¡Documento firmado exitosamente!',
    successMessage: 'Su firma ha sido registrada. Puede cerrar esta página.',
    closeWindow: 'Cerrar',
    signatureRequired: 'Por favor dibuje su firma',
    acceptRequired: 'Por favor acepte los términos del documento',
    retry: 'Reintentar'
  }
};

const ConsentSigningPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consentData, setConsentData] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Signature canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Get language from consent data or browser
  const language = consentData?.language || navigator.language?.split('-')[0] || 'fr';
  const t = translations[language] || translations.fr;

  // Fetch consent data
  useEffect(() => {
    const fetchConsentData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/public/sign/${token}`);
        const data = await response.json();

        if (!response.ok) {
          if (data.error?.status === 'signed') {
            setError({ type: 'signed', message: data.error.message });
          } else if (data.error?.message?.includes('expired')) {
            setError({ type: 'expired', message: data.error.message });
          } else {
            setError({ type: 'invalid', message: data.error?.message || 'Unknown error' });
          }
          return;
        }

        setConsentData(data.data);
      } catch (err) {
        console.error('Error fetching consent:', err);
        setError({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchConsentData();
    }
  }, [token]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size based on container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 200;

      // Set drawing style
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [consentData]);

  // Drawing functions
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setValidationError('');
  };

  // Submit signature
  const handleSubmit = async () => {
    setValidationError('');

    if (!accepted) {
      setValidationError(t.acceptRequired);
      return;
    }

    if (!hasSignature) {
      setValidationError(t.signatureRequired);
      return;
    }

    try {
      setSigning(true);

      // Get signature image as base64
      const canvas = canvasRef.current;
      const signatureImage = canvas.toDataURL('image/png');

      // Detect device type
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
      const deviceType = isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop');

      const response = await fetch(`${API_BASE_URL}/public/sign/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signatureImage,
          signatureMethod: 'digital',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Signature failed');
      }

      setSigned(true);
    } catch (err) {
      console.error('Error signing consent:', err);
      setValidationError(err.message);
    } finally {
      setSigning(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };

    const locales = {
      fr: 'fr-FR',
      en: 'en-US',
      es: 'es-ES'
    };

    return date.toLocaleDateString(locales[language] || 'fr-FR', options);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Render error states
  if (error) {
    const errorConfig = {
      expired: { icon: Clock, color: 'text-orange-500', title: t.expired, message: t.expiredMessage },
      signed: { icon: CheckCircle, color: 'text-green-500', title: t.alreadySigned, message: t.alreadySignedMessage },
      invalid: { icon: AlertTriangle, color: 'text-red-500', title: t.invalid, message: t.invalidMessage },
      error: { icon: AlertTriangle, color: 'text-red-500', title: t.error, message: error.message }
    };

    const config = errorConfig[error.type] || errorConfig.error;
    const Icon = config.icon;

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <Icon className={`w-16 h-16 ${config.color} mx-auto mb-4`} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{config.title}</h1>
          <p className="text-gray-600 mb-6">{config.message}</p>
          {error.type === 'error' && (
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.retry}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render success state
  if (signed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.success}</h1>
          <p className="text-gray-600 mb-6">{t.successMessage}</p>
          <button
            onClick={() => window.close()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            {t.closeWindow}
          </button>
        </div>
      </div>
    );
  }

  // Render signing page
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8" />
            <h1 className="text-xl font-bold">{t.documentToSign}</h1>
          </div>
          <div className="flex items-center gap-2 text-blue-100 text-sm">
            <Clock className="w-4 h-4" />
            <span>{t.expiresOn}: {formatDate(consentData.expiresAt)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 pb-32">
        {/* Greeting */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t.hello} {consentData.patient.firstName} {consentData.patient.lastName},
          </h2>
          <p className="text-gray-600 mt-1">{t.readCarefully}</p>
        </div>

        {/* Custom message from clinic */}
        {consentData.customMessage && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-lg">
            <h3 className="font-medium text-yellow-800 mb-1">{t.messageFromClinic}</h3>
            <p className="text-yellow-700 italic">"{consentData.customMessage}"</p>
          </div>
        )}

        {/* Document content */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {consentData.consent.title}
          </h3>

          {consentData.consent.description && (
            <p className="text-gray-600 mb-4">{consentData.consent.description}</p>
          )}

          <div className="border-t pt-4">
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: consentData.consent.terms.replace(/\n/g, '<br/>') }}
            />
          </div>
        </div>

        {/* Accept checkbox */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked);
                setValidationError('');
              }}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">{t.iAgree}</span>
          </label>
        </div>

        {/* Signature pad */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{t.signBelow}</h3>
            <button
              onClick={clearSignature}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              {t.clear}
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-3">{t.signatureInstructions}</p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>

        {/* Validation error */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {validationError}
          </div>
        )}
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={signing}
            className={`w-full py-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2
              ${signing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'}`}
          >
            {signing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {t.signing}
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {t.signDocument}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentSigningPage;
