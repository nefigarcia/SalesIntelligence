'use client';

import React, { useState, useEffect } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

/**
 * Ensures Firebase is initialized only once on the client side.
 * This prevents "invalid API key" errors during Next.js SSR/build time
 * where environment variables might not be available.
 */
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<ReturnType<typeof initializeFirebase> | null>(null);

  useEffect(() => {
    try {
      const firebaseInstances = initializeFirebase();
      setInstances(firebaseInstances);
    } catch (error) {
      console.error("Firebase initialization failed:", error);
    }
  }, []);

  if (!instances) {
    // Show a minimal loading state while initializing Firebase on the client
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <FirebaseProvider app={instances.app} db={instances.db} auth={instances.auth}>
      {children}
    </FirebaseProvider>
  );
}
