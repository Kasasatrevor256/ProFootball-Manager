// Firebase Admin SDK for server-side operations
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let adminDb: ReturnType<typeof getFirestore> | null = null;

function initializeFirebaseAdmin() {
  if (adminApp) {
    return; // Already initialized
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    return;
  }

  try {
    let serviceAccount: any;

    // Try to get service account from environment variable (for Vercel/production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        // Ensure project_id is converted to projectId if needed
        if (serviceAccount.project_id && !serviceAccount.projectId) {
          serviceAccount.projectId = serviceAccount.project_id;
        }
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseError);
      }
    }

    // If not from env, try individual env variables
    if (!serviceAccount || !serviceAccount.projectId) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        serviceAccount = {
          projectId,
          clientEmail,
          privateKey,
        };
      }
    }

    // If still no service account, try to load from key.json (for local development)
    if (!serviceAccount || !serviceAccount.projectId) {
      try {
        // Only try to require key.json in Node.js environment (not during build)
        if (typeof require !== 'undefined' && !process.env.VERCEL) {
          const keyPath = require('path').join(process.cwd(), 'key.json');
          const fs = require('fs');
          if (fs.existsSync(keyPath)) {
            const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            serviceAccount = {
              projectId: keyFile.project_id || keyFile.projectId,
              clientEmail: keyFile.client_email || keyFile.clientEmail,
              privateKey: (keyFile.private_key || keyFile.privateKey)?.replace(/\\n/g, '\n'),
            };
          }
        }
      } catch (fileError) {
        // Silently fail during build - key.json might not be available
        if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
          console.warn('Could not load key.json:', fileError);
        }
      }
    }

    // Validate service account before initializing
    if (!serviceAccount || !serviceAccount.projectId) {
      // During build, we might not have credentials - that's okay
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('⚠️ Firebase credentials not available during build - this is normal');
        return;
      }
      throw new Error('Firebase service account is missing required fields. Need: projectId, clientEmail, privateKey');
    }

    // Ensure all required fields are present
    if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error('Firebase service account is missing clientEmail or privateKey');
    }

    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });

    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);

    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    // During build phase, don't throw - just log
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('⚠️ Firebase Admin initialization skipped during build:', error);
      return;
    }
    console.error('❌ Firebase admin initialization error:', error);
    // Don't throw during build - let the app continue
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      console.warn('⚠️ Continuing without Firebase Admin - ensure env vars are set in Vercel');
      return;
    }
    throw error;
  }
}

// Initialize Firebase Admin
initializeFirebaseAdmin();

// Helper function to ensure Firebase is initialized (for runtime use)
function ensureFirebaseInitialized() {
  if (!adminApp || !adminDb) {
    initializeFirebaseAdmin();
    if (!adminApp || !adminDb) {
      throw new Error('Firebase Admin is not initialized. Please check your Firebase credentials.');
    }
  }
  return { adminApp, adminAuth, adminDb };
}

// Export with null checks for build-time safety
export { adminApp, adminAuth, adminDb, ensureFirebaseInitialized };
