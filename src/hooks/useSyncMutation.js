/**
 * Hook pour mutations SYNCHRONES avec optimistic updates
 *
 * Garantit:
 * ✅ Update local IMMÉDIAT (optimistic)
 * ✅ Sync avec API en background
 * ✅ Rollback si erreur
 * ✅ Queue offline avec retry automatique
 * ✅ User voit TOUT INSTANTANÉMENT
 *
 * Usage:
 * const { mutate, isPending } = useSyncMutation(
 *   patientContext,
 *   '/api/v1/patients',
 *   'PATCH'
 * );
 *
 * // Utilisateur voit le changement IMMÉDIATEMENT
 * await mutate(patientId, { first_name: 'Jean' });
 */

import { useCallback, useState } from 'react';
import { getMutationQueue } from '../utils/mutationQueue';

export const useSyncMutation = (
  context,          // PatientContext, AppointmentContext, etc
  baseEndpoint,     // '/api/v1/patients'
  method = 'PATCH'
) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const queue = getMutationQueue();

  const mutate = useCallback(
    async (itemId, updateData, options = {}) => {
      try {
        setError(null);
        setIsPending(true);

        const previousData = options.previousState;
        const endpoint = `${baseEndpoint}/${itemId}`;

        // 1️⃣ UPDATE LOCAL IMMÉDIATEMENT (optimistic)
        // C'est la clé de la synchronité!
        if (context.updatePatient) {
          // Patient context
          await context.updatePatient(itemId, updateData, {
            reason: options.reason || 'User update'
          });
        } else if (context.updateAppointment) {
          // Appointment context
          await context.updateAppointment(itemId, updateData, {
            reason: options.reason || 'User update'
          });
        } else if (context.updateMedicalRecord) {
          // MedicalRecord context
          await context.updateMedicalRecord(itemId, updateData, {
            reason: options.reason || 'User update'
          });
        }

        // ✅ L'utilisateur voit le changement MAINTENANT
        console.log('✅ Local state updated immediately');

        // 2️⃣ SYNCHRONISER AVEC L'API EN ARRIÈRE PLAN
        // Ajouter à la queue (qui gère offline)
        await queue.enqueue({
          id: `${itemId}-${Date.now()}`,
          type: method,
          endpoint,
          data: updateData,
          previousState: previousData
        });

        setIsPending(false);
        return updateData;
      } catch (err) {
        console.error('Sync mutation failed:', err);
        setError(err.message);
        setIsPending(false);
        throw err;
      }
    },
    [context, baseEndpoint, method, queue]
  );

  // Créer (POST)
  const create = useCallback(
    async (createData, options = {}) => {
      try {
        setError(null);
        setIsPending(true);

        // 1️⃣ CRÉER LOCALEMENT IMMÉDIATEMENT
        let newItem;
        if (context.createPatient) {
          newItem = await context.createPatient(createData, {
            reason: options.reason || 'User create'
          });
        } else if (context.createAppointment) {
          newItem = await context.createAppointment(createData, {
            reason: options.reason || 'User create'
          });
        } else if (context.createMedicalRecord) {
          newItem = await context.createMedicalRecord(createData, {
            reason: options.reason || 'User create'
          });
        }

        // ✅ L'utilisateur voit le nouvel item MAINTENANT
        console.log('✅ New item created and visible immediately');

        // 2️⃣ SYNCHRONISER AVEC L'API
        await queue.enqueue({
          id: `create-${newItem.id}-${Date.now()}`,
          type: 'POST',
          endpoint: baseEndpoint,
          data: createData,
          itemId: newItem.id
        });

        setIsPending(false);
        return newItem;
      } catch (err) {
        console.error('Create mutation failed:', err);
        setError(err.message);
        setIsPending(false);
        throw err;
      }
    },
    [context, baseEndpoint, queue]
  );

  // Supprimer (DELETE)
  const delete_ = useCallback(
    async (itemId, options = {}) => {
      try {
        setError(null);
        setIsPending(true);

        // Sauvegarder l'état avant suppression (pour rollback)
        const previousState = options.previousState;

        // 1️⃣ SUPPRIMER LOCALEMENT IMMÉDIATEMENT
        if (context.deletePatient) {
          await context.deletePatient(itemId, {
            reason: options.reason || 'User delete'
          });
        } else if (context.deleteAppointment) {
          await context.deleteAppointment(itemId, {
            reason: options.reason || 'User delete'
          });
        } else if (context.deleteMedicalRecord) {
          await context.deleteMedicalRecord(itemId, {
            reason: options.reason || 'User delete'
          });
        }

        // ✅ L'utilisateur voit l'item supprimé MAINTENANT
        console.log('✅ Item deleted from view immediately');

        // 2️⃣ SYNCHRONISER AVEC L'API
        const endpoint = `${baseEndpoint}/${itemId}`;
        await queue.enqueue({
          id: `delete-${itemId}-${Date.now()}`,
          type: 'DELETE',
          endpoint,
          data: {},
          previousState
        });

        setIsPending(false);
        return { id: itemId, deleted: true };
      } catch (err) {
        console.error('Delete mutation failed:', err);
        setError(err.message);
        setIsPending(false);
        throw err;
      }
    },
    [context, baseEndpoint, queue]
  );

  // Obtenir les mutations en attente
  const getPending = useCallback(() => {
    return queue.getPending();
  }, [queue]);

  return {
    mutate,        // Update
    create,        // Create
    delete: delete_,// Delete
    isPending,
    error,
    getPending
  };
};

export default useSyncMutation;
