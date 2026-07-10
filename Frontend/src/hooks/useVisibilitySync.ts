import { useEffect } from 'react';
import { isOnline } from '../services/api';

/**
 * Tab visible hone pe custom event fire karo
 * Saare contexts is event ko sun ke foran sync karenge
 */
export function useVisibilitySync() {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isOnline()) {
        // Sab contexts ko foran sync karne ka signal
        window.dispatchEvent(new CustomEvent('dairy-visibility-sync'));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
}
