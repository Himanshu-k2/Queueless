import React, { createContext, useContext, useState, useEffect } from 'react';
import { getPendingActions, markActionSyncing, removePendingAction } from '../utils/idb';

const NetworkContext = createContext();

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Statuses: 'Online', 'Offline', 'Saved locally', 'Pending synchronization', 'Successfully synchronized', 'Synchronization failed'
  const [syncStatus, setSyncStatus] = useState(navigator.onLine ? 'Online' : 'Offline');
  const [pendingCount, setPendingCount] = useState(0);

  const checkPendingCount = async () => {
    try {
      const actions = await getPendingActions();
      setPendingCount(actions.length);
    } catch (e) {
      console.error("Failed to check pending count", e);
    }
  };

  const syncActions = async () => {
    if (!navigator.onLine) return;
    
    try {
      const actions = await getPendingActions();
      if (actions.length === 0) return;

      setSyncStatus('Pending synchronization');

      let failed = false;
      for (const action of actions) {
        if (action.syncing) continue; // prevent duplicate sync
        
        await markActionSyncing(action.id, true);
        
        try {
          const res = await fetch(action.url, {
            method: action.method,
            headers: action.headers,
            body: action.body
          });

          if (res.ok) {
            await removePendingAction(action.id);
          } else {
            failed = true;
            await markActionSyncing(action.id, false);
          }
        } catch (e) {
          failed = true;
          await markActionSyncing(action.id, false);
        }
      }

      await checkPendingCount();

      if (failed) {
        setSyncStatus('Synchronization failed');
      } else {
        // Confirm server success before showing this
        setSyncStatus('Successfully synchronized');
        setTimeout(() => setSyncStatus('Online'), 3000);
      }
    } catch (e) {
      console.error(e);
      setSyncStatus('Synchronization failed');
    }
  };

  useEffect(() => {
    checkPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('Online');
      syncActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also poll every 15s to retry if pending actions exist and we are online
    const interval = setInterval(() => {
      if (navigator.onLine) syncActions();
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const reportLocalSave = async () => {
    setSyncStatus('Saved locally');
    await checkPendingCount();
  };

  return (
    <NetworkContext.Provider value={{ isOnline, syncStatus, pendingCount, reportLocalSave, checkPendingCount }}>
      {children}
    </NetworkContext.Provider>
  );
};
