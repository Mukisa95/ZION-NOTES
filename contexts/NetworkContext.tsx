import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { flushSyncQueue, getPendingCount } from '../services/offlineSyncQueue';
import { enableFirestoreNetwork } from '../services/firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NetworkContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  /** Manually trigger a sync attempt (no-op if already syncing or offline) */
  triggerSync: (userId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  triggerSync: async () => {},
});

export const useNetwork = () => useContext(NetworkContext);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface NetworkProviderProps {
  children: React.ReactNode;
  /** Current authenticated user ID — required for sync; pass null when logged out. */
  userId: string | null;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children, userId }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const isSyncingRef = useRef(false);

  // Refresh the pending count badge
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // non-critical
    }
  }, []);

  // Core sync logic
  const triggerSync = useCallback(async (uid: string) => {
    if (isSyncingRef.current || !navigator.onLine) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      // Re-enable Firestore network (it may have been suppressed)
      await enableFirestoreNetwork();

      let remaining = await getPendingCount();
      setPendingCount(remaining);

      if (remaining === 0) return;

      await flushSyncQueue(uid, (rem) => {
        setPendingCount(rem);
      });

      // Final count after flush
      await refreshPendingCount();
    } catch (err) {
      console.error('NetworkContext: sync error', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  // Network event listeners
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Give Firestore a moment to reconnect then sync
      if (userId) {
        setTimeout(() => triggerSync(userId), 1500);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending count on mount
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId, triggerSync, refreshPendingCount]);

  // Re-sync when userId changes (e.g. login after offline edits)
  useEffect(() => {
    if (userId && isOnline) {
      triggerSync(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <NetworkContext.Provider value={{ isOnline, isSyncing, pendingCount, triggerSync }}>
      {children}
    </NetworkContext.Provider>
  );
};
