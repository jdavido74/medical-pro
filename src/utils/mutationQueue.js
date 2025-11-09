/**
 * Mutation Queue - File d'attente pour mutations avec persistance offline
 *
 * Pattern:
 * - Si API OK: exécuter immédiatement
 * - Si offline: queue en localStorage, retry quand online
 * - Garantit que les mutations sont exécutées dans l'ordre
 *
 * Usage:
 * const queue = new MutationQueue();
 * await queue.enqueue({
 *   id: 'mutation-1',
 *   type: 'PATCH',
 *   endpoint: '/patients/123',
 *   data: { first_name: 'Jean' },
 *   optimisticUpdate: (data) => { ... }
 * });
 */

class MutationQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.isOnline = navigator.onLine;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.storageKey = 'medicalPro_mutation_queue';

    // Écouter la connexion réseau
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Charger les mutations en attente depuis localStorage
    this.loadFromStorage();
  }

  /**
   * Enqueuer une mutation
   */
  async enqueue(mutation) {
    const id = mutation.id || `mutation-${Date.now()}`;
    const queueItem = {
      id,
      timestamp: Date.now(),
      retries: 0,
      ...mutation
    };

    // Ajouter à la queue
    this.queue.push(queueItem);

    // Persister en localStorage
    this.saveToStorage();

    // Essayer de traiter si online
    if (this.isOnline) {
      await this.process();
    }

    return id;
  }

  /**
   * Traiter la queue (FIFO)
   */
  async process() {
    if (this.isProcessing || this.queue.length === 0 || !this.isOnline) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.isOnline) {
        const mutation = this.queue[0];

        try {
          // Exécuter la mutation
          const result = await this.executeMutation(mutation);

          // Success: retirer de la queue
          this.queue.shift();
          this.saveToStorage();

          console.log(`✅ Mutation executed: ${mutation.id}`, result);
        } catch (error) {
          // Erreur: retry
          mutation.retries = (mutation.retries || 0) + 1;

          if (mutation.retries < this.maxRetries && this.isOnline) {
            // Attendre 2s avant retry (backoff exponentiel)
            const delay = Math.pow(2, mutation.retries) * 1000;
            console.warn(`⚠️ Mutation failed, retry ${mutation.retries}/${this.maxRetries} in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
            this.saveToStorage();
          } else {
            // Max retries atteint: vider la queue et notifier
            console.error(`❌ Mutation failed after ${this.maxRetries} retries:`, error);
            this.queue.shift();
            this.saveToStorage();

            // Émettre un événement pour notifier l'UI
            window.dispatchEvent(new CustomEvent('mutation:error', {
              detail: { mutation, error }
            }));
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Exécuter une mutation API
   */
  async executeMutation(mutation) {
    const token = localStorage.getItem('medicalPro_auth_token');

    if (!token) {
      throw new Error('No auth token');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const options = {
      method: mutation.type || 'PATCH',
      headers,
      body: JSON.stringify(mutation.data)
    };

    const response = await fetch(mutation.endpoint, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Sauvegarder la queue en localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(this.queue)
      );
    } catch (error) {
      console.error('Failed to save mutation queue:', error);
    }
  }

  /**
   * Charger la queue depuis localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📦 Loaded ${this.queue.length} mutations from storage`);
      }
    } catch (error) {
      console.error('Failed to load mutation queue:', error);
    }
  }

  /**
   * Événement: connexion rétablie
   */
  async handleOnline() {
    console.log('🔗 Connection restored');
    this.isOnline = true;
    await this.process();
  }

  /**
   * Événement: connexion perdue
   */
  handleOffline() {
    console.log('📵 Connection lost');
    this.isOnline = false;
  }

  /**
   * Vider la queue (danger!)
   */
  clear() {
    this.queue = [];
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Obtenir le nombre de mutations en attente
   */
  getPendingCount() {
    return this.queue.length;
  }

  /**
   * Obtenir les mutations en attente
   */
  getPending() {
    return [...this.queue];
  }
}

// Singleton
let instance = null;

export const getMutationQueue = () => {
  if (!instance) {
    instance = new MutationQueue();
  }
  return instance;
};

export default MutationQueue;
