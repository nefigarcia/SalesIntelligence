'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { getRedirectResult } from 'firebase/auth';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount
  // After initialization, handle possible redirect-based OAuth results from providers.
  useEffect(() => {
    let mounted = true;
    async function handleRedirect() {
      try {
        if (!firebaseServices?.auth) return;
        const result = await getRedirectResult(firebaseServices.auth as any);
        // If a redirect result exists, firebase will have already updated auth state
        // via onAuthStateChanged. We log for debugging; production can remove this.
        if (mounted && result) {
          console.log('Firebase redirect sign-in result:', result);
        }
      } catch (err) {
        console.warn('No redirect result or error handling redirect sign-in', err);
      }
    }
    handleRedirect();
    return () => { mounted = false; };
  }, [firebaseServices]);
  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}