
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
    const firebaseInstances = initializeFirebase();
    // Only set instances if all required services are successfully initialized
    if (firebaseInstances && firebaseInstances.app && firebaseInstances.db && firebaseInstances.auth) {
      setInstances(firebaseInstances);
    } else {
      // If we got null back, it means config is missing or invalid
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <div className="w-8 h-8 border-4 border-destructive border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-destructive">Configuration Error</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Firebase could not be initialized. This usually means the API key in your <strong>.env</strong> file is missing or invalid.
        </p>
        <div className="bg-slate-50 p-4 rounded-lg text-left text-xs font-mono border max-w-lg overflow-auto">
          <p className="mb-2 font-bold text-slate-700">Check your .env file for:</p>
          <p>NEXT_PUBLIC_FIREBASE_API_KEY=...</p>
          <p>NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-1275639087-a4e7e</p>
        </div>
      </div>
    );
  }

  if (!instances) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm font-medium">Connecting to Firebase...</p>
        </div>
      </div>
    );
  }

  return (
    <FirebaseProvider app={instances.app} db={instances.db} auth={instances.auth}>
      {children}
    </FirebaseProvider>
  );
}
