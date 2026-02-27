'use client';

import React, { useState, useEffect } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

/**
 * Ensures Firebase is initialized only once on the client side.
 * Deferring to useEffect prevents SSR errors with missing environment variables.
 */
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<{app: any, db: any, auth: any} | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    try {
      const firebaseInstances = initializeFirebase();
      if (firebaseInstances && firebaseInstances.app) {
        setInstances(firebaseInstances);
      } else {
        // Fallback or warning if config is missing
        setError(true);
      }
    } catch (err) {
      console.error("Firebase initialization failed:", err);
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Configuration Missing</h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          Firebase API keys are not detected. Please add your environment variables to the .env file.
        </p>
        {children}
      </div>
    );
  }

  if (!instances) {
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
