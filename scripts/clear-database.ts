#!/usr/bin/env ts-node

/**
 * Clear all test data from Firestore database
 * WARNING: This will delete ALL data in your database!
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function clearCollection(db: FirebaseFirestore.Firestore, collectionName: string): Promise<number> {
  const collectionRef = db.collection(collectionName);
  const batchSize = 500;
  let deletedCount = 0;

  const deleteQueryBatch = async (): Promise<number> => {
    const snapshot = await collectionRef.limit(batchSize).get();

    if (snapshot.size === 0) {
      return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  };

  let numDeleted = 0;
  do {
    numDeleted = await deleteQueryBatch();
    deletedCount += numDeleted;
    if (numDeleted > 0) {
      process.stdout.write(`\r  Deleted ${deletedCount} documents from ${collectionName}...`);
    }
  } while (numDeleted > 0);

  console.log('');
  return deletedCount;
}

async function clearDatabase() {
  try {
    // Initialize Firebase Admin
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error('❌ Error: Missing Firebase credentials in .env.local');
      console.error('Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.');
      process.exit(1);
    }

    initializeApp({
      credential: cert(serviceAccount),
    });

    const db = getFirestore();

    console.log('\n🔥 Firebase Database Cleanup Tool\n');
    console.log('⚠️  WARNING: This will DELETE ALL data from your Firestore database!');
    console.log('Project:', serviceAccount.projectId);
    console.log('\nCollections that will be cleared:');
    console.log('  - players');
    console.log('  - payments');
    console.log('  - expenses');
    console.log('  - match_days');
    console.log('  - users (except admin users)');
    console.log('');

    const confirm1 = await question('Are you sure you want to continue? (type "yes" to confirm): ');

    if (confirm1.toLowerCase() !== 'yes') {
      console.log('\n❌ Cleanup cancelled.');
      rl.close();
      process.exit(0);
    }

    const confirm2 = await question('\n⚠️  LAST WARNING: All data will be permanently deleted! Type "DELETE" to confirm: ');

    if (confirm2 !== 'DELETE') {
      console.log('\n❌ Cleanup cancelled.');
      rl.close();
      process.exit(0);
    }

    console.log('\n🗑️  Starting database cleanup...\n');

    // Clear collections
    const collections = ['players', 'payments', 'expenses', 'match_days'];

    for (const collection of collections) {
      const count = await clearCollection(db, collection);
      console.log(`✅ Cleared ${collection}: ${count} documents deleted`);
    }

    // Clear users but keep admin users
    console.log('\n🔐 Clearing users (keeping admin users)...');
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.where('role', '!=', 'admin').get();

    const batch = db.batch();
    let nonAdminCount = 0;
    usersSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      nonAdminCount++;
    });

    if (nonAdminCount > 0) {
      await batch.commit();
      console.log(`✅ Cleared users: ${nonAdminCount} non-admin users deleted`);
    } else {
      console.log('✅ No non-admin users to delete');
    }

    // Get count of remaining admin users
    const adminSnapshot = await usersRef.where('role', '==', 'admin').get();
    console.log(`ℹ️  Kept ${adminSnapshot.size} admin user(s)`);

    console.log('\n✨ Database cleanup completed successfully!');
    console.log('\nYour database now contains:');
    console.log(`  - ${adminSnapshot.size} admin user(s)`);
    console.log('  - 0 players');
    console.log('  - 0 payments');
    console.log('  - 0 expenses');
    console.log('  - 0 match days');
    console.log('\nYou can now start adding real data! 🚀\n');

  } catch (error) {
    console.error('\n❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

clearDatabase();
