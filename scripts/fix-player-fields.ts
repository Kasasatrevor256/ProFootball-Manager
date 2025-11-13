import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

initializeApp({
  credential: cert(serviceAccount as any)
});

const db = getFirestore();

async function fixPlayerFields() {
  console.log('🔧 Fixing player field names...\n');

  const playersSnapshot = await db.collection('players').get();
  let batch = db.batch();
  let count = 0;
  let updated = 0;

  for (const doc of playersSnapshot.docs) {
    const data = doc.data();

    // Check if fields need to be renamed
    if (data.annualAmount !== undefined || data.monthlyAmount !== undefined || data.pitchAmount !== undefined) {
      const updates: any = {};

      if (data.annualAmount !== undefined) {
        updates.annual = data.annualAmount;
        updates.annualAmount = FieldValue.delete();
      }

      if (data.monthlyAmount !== undefined) {
        updates.monthly = data.monthlyAmount;
        updates.monthlyAmount = FieldValue.delete();
      }

      if (data.pitchAmount !== undefined) {
        updates.pitch = data.pitchAmount;
        updates.pitchAmount = FieldValue.delete();
      }

      if (data.matchDayAmount !== undefined) {
        updates.matchDay = data.matchDayAmount;
        updates.matchDayAmount = FieldValue.delete();
      }

      batch.update(doc.ref, updates);
      count++;
      updated++;

      if (count >= 500) {
        await batch.commit();
        batch = db.batch();
        count = 0;
        console.log(`Updated ${updated} players...`);
      }
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`\n✅ Fixed ${updated} player records`);
}

fixPlayerFields()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
