/**
 * VersionChecker — checks if the app version matches the deployed version.
 * On mismatch: clears caches + shows a reload banner.
 *
 * Expects /version.json at the root with: { "version": "...", "buildTime": "..." }
 * Generated at build time via the build script.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const LOCAL_VERSION_KEY = 'medimaestro_app_version';

const VersionChecker = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');

  const checkVersion = useCallback(async () => {
    try {
      // Fetch version.json with cache-busting query param
      const response = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;

      const data = await response.json();
      const serverVersion = data.version;
      const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);

      if (!localVersion) {
        // First visit — store version silently
        localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
        return;
      }

      if (localVersion !== serverVersion) {
        setNewVersion(serverVersion);
        setUpdateAvailable(true);
      }
    } catch {
      // Silent fail — version check is non-critical
    }
  }, []);

  useEffect(() => {
    // Check on mount
    checkVersion();

    // Check periodically
    const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkVersion]);

  const handleUpdate = async () => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }

      // Update stored version
      localStorage.setItem(LOCAL_VERSION_KEY, newVersion);

      // Force reload from server
      window.location.reload(true);
    } catch {
      window.location.reload(true);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm bg-blue-600 text-white rounded-lg shadow-xl p-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <RefreshCw className="h-5 w-5 flex-shrink-0 mt-0.5 animate-spin-slow" />
        <div className="flex-1">
          <p className="font-medium text-sm">Nueva versión disponible</p>
          <p className="text-xs text-blue-200 mt-0.5">v{newVersion}</p>
        </div>
        <button
          onClick={handleUpdate}
          className="bg-white text-blue-600 px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-50 flex-shrink-0"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
};

export default VersionChecker;
