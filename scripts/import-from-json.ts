#!/usr/bin/env ts-node

/**
 * Import data from JSON files (exported from PostgreSQL) to Firestore
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

async function importData() {
  try {
    console.log('\n📥 Import PostgreSQL JSON Data to Firestore\n');

    // Initialize Firebase
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error('❌ Error: Missing Firebase credentials in .env.local');
      process.exit(1);
    }

    initializeApp({
      credential: cert(serviceAccount),
    });

    const db = getFirestore();
    console.log('✅ Connected to Firestore\n');

    // Check if JSON files exist
    const files = ['players.json', 'payments.json', 'expenses.json', 'users.json'];
    const missingFiles = files.filter(f => !fs.existsSync(f));

    if (missingFiles.length > 0) {
      console.error('❌ Missing JSON files:', missingFiles.join(', '));
      console.log('\nPlease export data from PostgreSQL first.');
      console.log('See EXPORT-POSTGRES-DATA.md for instructions.\n');
      process.exit(1);
    }

    console.log('✅ Found all JSON files\n');

    // Import Players
    console.log('📥 Importing players...');
    const playersData = fs.readFileSync('players.json', 'utf-8')
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    const playerIdMap = new Map<number, string>();
    let playersAdded = 0;

    for (const player of playersData) {
      const playerRef = db.collection('players').doc();
      await playerRef.set({
        name: player.name || '',
        phone: player.phone || '',
        annual: parseFloat(player.annual) || 0,
        monthly: parseFloat(player.monthly) || 0,
        pitch: parseFloat(player.pitch) || 0,
        matchDay: parseFloat(player.match_day) || 0,
        createdAt: player.created_at || new Date().toISOString(),
        updatedAt: player.updated_at || new Date().toISOString(),
      });

      // Map old ID to new Firestore ID
      playerIdMap.set(player.id, playerRef.id);
      playersAdded++;

      if (playersAdded % 50 === 0) {
        console.log(`  ✓ Imported ${playersAdded} players...`);
      }
    }
    console.log(`✅ Imported ${playersAdded} players\n`);

    // Import Payments
    console.log('📥 Importing payments...');
    const paymentsData = fs.readFileSync('payments.json', 'utf-8')
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    let paymentsAdded = 0;

    for (const payment of paymentsData) {
      const newPlayerId = playerIdMap.get(payment.player_id);

      if (!newPlayerId) {
        console.log(`⚠️  Warning: Skipping payment - player ID ${payment.player_id} not found`);
        continue;
      }

      const paymentRef = db.collection('payments').doc();
      await paymentRef.set({
        playerId: newPlayerId,
        playerName: payment.player_name || '',
        paymentType: payment.payment_type,
        amount: parseFloat(payment.amount) || 0,
        date: payment.date || new Date().toISOString().split('T')[0],
        createdBy: payment.created_by || '',
        createdAt: payment.created_at || new Date().toISOString(),
        updatedAt: payment.updated_at || new Date().toISOString(),
      });
      paymentsAdded++;

      if (paymentsAdded % 50 === 0) {
        console.log(`  ✓ Imported ${paymentsAdded} payments...`);
      }
    }
    console.log(`✅ Imported ${paymentsAdded} payments\n`);

    // Import Expenses
    console.log('📥 Importing expenses...');
    const expensesData = fs.readFileSync('expenses.json', 'utf-8')
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    let expensesAdded = 0;

    for (const expense of expensesData) {
      const expenseRef = db.collection('expenses').doc();
      await expenseRef.set({
        description: expense.description || '',
        category: expense.category || 'Other',
        amount: parseFloat(expense.amount) || 0,
        expenseDate: expense.expense_date || new Date().toISOString().split('T')[0],
        matchDayId: expense.match_day_id || null,
        createdBy: expense.created_by || '',
        createdAt: expense.created_at || new Date().toISOString(),
        updatedAt: expense.updated_at || new Date().toISOString(),
      });
      expensesAdded++;

      if (expensesAdded % 50 === 0) {
        console.log(`  ✓ Imported ${expensesAdded} expenses...`);
      }
    }
    console.log(`✅ Imported ${expensesAdded} expenses\n`);

    // Import Users
    console.log('📥 Importing users...');
    const usersData = fs.readFileSync('users.json', 'utf-8')
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    let usersAdded = 0;

    for (const user of usersData) {
      const userRef = db.collection('users').doc();
      await userRef.set({
        name: user.name || '',
        email: user.email,
        role: user.role || 'viewer',
        status: user.status || 'active',
        passwordHash: user.password_hash || '',
        createdAt: user.created_at || new Date().toISOString(),
        updatedAt: user.updated_at || new Date().toISOString(),
      });
      usersAdded++;
    }
    console.log(`✅ Imported ${usersAdded} users\n`);

    console.log('\n✨ Import completed successfully!\n');
    console.log('Summary:');
    console.log(`  ✓ ${playersAdded} players imported`);
    console.log(`  ✓ ${paymentsAdded} payments imported`);
    console.log(`  ✓ ${expensesAdded} expenses imported`);
    console.log(`  ✓ ${usersAdded} users imported`);
    console.log('\n⚠️  Note: User passwords were imported as hashes.\n');

    // Cleanup - ask if user wants to delete JSON files
    console.log('📁 JSON files can now be deleted if you want.');
    console.log('Run: rm players.json payments.json expenses.json users.json\n');

  } catch (error) {
    console.error('\n❌ Import error:', error);
    process.exit(1);
  }
}

importData();
