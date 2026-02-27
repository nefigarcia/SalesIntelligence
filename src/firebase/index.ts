
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

/**
 * Initializes Firebase services and ensures they are only created once.
 * Note: An inert comment change here triggers a security rules redeployment to fix permission errors.
 */
export function initializeFirebase() {
  try {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      const hasConfig = 
        firebaseConfig.apiKey && 
        firebaseConfig.apiKey !== 'undefined' && 
        firebaseConfig.apiKey.length > 0;

      if (!hasConfig) {
        console.warn("Firebase configuration is missing or invalid.");
        return null;
      }
      
      app = initializeApp(firebaseConfig);
    }

    if (app) {
      db = getFirestore(app);
      auth = getAuth(app);
    }

    return { app, db, auth };
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    return null;
  }
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
