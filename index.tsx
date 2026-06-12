
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { useAuth } from './contexts/AuthContext';

/**
 * Inner wrapper so NetworkProvider can access the authenticated user
 * (AuthProvider must be the outer parent).
 */
const AppWithNetwork: React.FC = () => {
  const { user } = useAuth();
  return (
    <NetworkProvider userId={user?.uid ?? null}>
      <App />
    </NetworkProvider>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Service worker lifecycle management
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In dev mode: aggressively unregister all SWs and clear their caches.
    // This prevents a previously-registered Workbox SW from intercepting
    // Firestore's long-lived streaming connections, which causes the
    // "INTERNAL ASSERTION FAILED: Unexpected state" crash.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
        console.log('[Dev] Unregistered service worker:', reg.scope);
      }
    });
    caches.keys().then((cacheNames) => {
      for (const name of cacheNames) {
        caches.delete(name);
        console.log('[Dev] Cleared cache:', name);
      }
    });
  } else {
    // In production: listen for SW controller changes so users always get
    // the latest build when a new SW version takes control.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

const root = ReactDOM.createRoot(rootElement);
// React.StrictMode is intentionally omitted in development.
// In React 18, StrictMode double-invokes effects (mount → unmount → remount)
// to surface side-effect bugs. However this is incompatible with the Firebase
// Firestore SDK: the SDK registers streaming listeners with Target IDs, and
// when React tears down and remounts a component before the first stream
// response arrives, Firestore throws "Target ID already exists" and cascading
// "INTERNAL ASSERTION FAILED: Unexpected state" errors.
// StrictMode only adds the double-invoke in development; production builds are
// unaffected regardless of whether StrictMode is present here.
root.render(
  <AuthProvider>
    <AppWithNetwork />
  </AuthProvider>
);
