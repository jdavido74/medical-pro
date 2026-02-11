import { useState, useEffect } from 'react';

/**
 * Hook pour obtenir l'adresse IP réelle du client
 * Élimine les hardcoded IPs ('127.0.0.1', 'localhost')
 *
 * @returns {string} IP du client ou 'unknown' en cas d'erreur
 *
 * @example
 * const clientIP = useClientIP();
 *
 * @example
 * // Usage dans un context ou service
 * const IP = useClientIP();
 * auditLog.log({ ..., ipAddress: IP });
 */
export const useClientIP = () => {
  const [clientIP, setClientIP] = useState('unknown');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClientIP = async () => {
      try {
        const apiBaseURL = process.env.REACT_APP_API_URL || '';
        const response = await fetch(`${apiBaseURL}/api/v1/auth/ip-info`);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.clientIP) {
            setClientIP(data.data.clientIP);
          }
        }
      } catch (error) {
        console.warn('[useClientIP] Failed to fetch client IP:', error.message);
        // Keep default 'unknown' value
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientIP();
  }, []);

  return { clientIP, isLoading };
};

/**
 * Service pour obtenir le client IP de manière synchrone
 * À utiliser en dehors des composants React (dans les utils/services)
 *
 * @returns {Promise<string>} IP du client
 *
 * @example
 * const ip = await getClientIPAsync();
 * auditLog.log({ ..., ipAddress: ip });
 */
export const getClientIPAsync = async () => {
  try {
    const apiBaseURL = process.env.REACT_APP_API_URL || '';
    const response = await fetch(`${apiBaseURL}/api/v1/auth/ip-info`);

    if (response.ok) {
      const data = await response.json();
      return data.data?.clientIP || 'unknown';
    }

    return 'unknown';
  } catch (error) {
    console.warn('[getClientIPAsync] Failed to fetch client IP:', error.message);
    return 'unknown';
  }
};

export default useClientIP;
