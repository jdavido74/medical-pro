/**
 * Hook pour mutations optimistes avec synchronisation API
 *
 * Pattern:
 * 1. Update local IMMÉDIATEMENT (sync)
 * 2. Appel API en parallèle (async)
 * 3. Rollback si erreur API
 * 4. User voit le changement TOUT DE SUITE
 *
 * Usage:
 * const { mutate, isPending, error } = useOptimisticMutation(
 *   async (data) => await api.patch(`/patients/${id}`, data),
 *   (optimisticData) => updatePatient(id, optimisticData)
 * );
 *
 * mutate({ first_name: 'Jean' }); // Local update IMMÉDIAT
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';

export const useOptimisticMutation = (
  apiCall,           // Fonction API async
  onOptimisticUpdate // Fonction pour update local immédiat
) => {
  const { user } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const [previousData, setPreviousData] = useState(null);

  const mutate = useCallback(
    async (data, options = {}) => {
      try {
        setError(null);
        setIsPending(true);

        // 1️⃣ SAUVEGARDE: Backup de l'état précédent
        if (options.previousState) {
          setPreviousData(options.previousState);
        }

        // 2️⃣ SYNC: Update local IMMÉDIATEMENT (optimistic)
        if (onOptimisticUpdate) {
          onOptimisticUpdate(data);
        }

        // 3️⃣ ASYNC: Appel API en parallèle
        const result = await apiCall(data);

        // 4️⃣ SUCCESS: Data confirmée par le serveur
        setIsPending(false);
        setPreviousData(null);

        return result;
      } catch (err) {
        // ❌ ERROR: Rollback à l'état précédent
        console.error('Optimistic mutation failed:', err);

        if (previousData && onOptimisticUpdate) {
          // Restaurer l'état précédent
          onOptimisticUpdate(previousData);
        }

        setError(err.message || 'An error occurred');
        setIsPending(false);
        throw err;
      }
    },
    [apiCall, onOptimisticUpdate]
  );

  return { mutate, isPending, error };
};

export default useOptimisticMutation;
