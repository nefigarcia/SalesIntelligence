'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

export function initializeFirebase() {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    // Basic validation to prevent crashing on missing keys during build/init
    const hasConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined';
    if (!hasConfig) {
      console.warn("Firebase configuration is missing or invalid. Check your environment variables.");
    }
    app = initializeApp(firebaseConfig);
  }

  db = getFirestore(app);
  auth = getAuth(app);

  return { app, db, auth };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
