#!/usr/bin/env ts-node

/**
 * Migrate data from PostgreSQL to Firestore
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// You'll need to install: npm install pg
import { Pool } from 'pg';

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

async function migrateData() {
  try {
    console.log('\n🔄 PostgreSQL to Firestore Migration Tool\n');

    // Get PostgreSQL connection details
    const pgHost = await question('PostgreSQL Host (default: localhost): ') || 'localhost';
    const pgPort = await question('PostgreSQL Port (default: 5432): ') || '5432';
    const pgDatabase = await question('PostgreSQL Database (default: football_manager): ') || 'football_manager';
    const pgUser = await question('PostgreSQL User (default: postgres): ') || 'postgres';
    const pgPassword = await question('PostgreSQL Password: ');

    console.log('\n📡 Connecting to PostgreSQL...');

    // Connect to PostgreSQL
    const pool = new Pool({
      host: pgHost,
      port: parseInt(pgPort),
      database: pgDatabase,
      user: pgUser,
      password: pgPassword,
    });

    // Test connection
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ Connected to PostgreSQL successfully!');
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      process.exit(1);
    }

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
    console.log('✅ Connected to Firestore successfully!');

    console.log('\n📊 Checking data in PostgreSQL...\n');

    // Count records
    const playersCount = await pool.query('SELECT COUNT(*) FROM players');
    const paymentsCount = await pool.query('SELECT COUNT(*) FROM payments');
    const expensesCount = await pool.query('SELECT COUNT(*) FROM expenses');
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');

    console.log(`Players: ${playersCount.rows[0].count}`);
    console.log(`Payments: ${paymentsCount.rows[0].count}`);
    console.log(`Expenses: ${expensesCount.rows[0].count}`);
    console.log(`Users: ${usersCount.rows[0].count}`);

    const confirm = await question('\nProceed with migration? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Migration cancelled.');
      await pool.end();
      rl.close();
      process.exit(0);
    }

    console.log('\n🚀 Starting migration...\n');

    // Migrate Players
    console.log('📥 Migrating players...');
    const playersResult = await pool.query('SELECT * FROM players ORDER BY id');
    const playersBatch = db.batch();
    let playersAdded = 0;

    for (const player of playersResult.rows) {
      const playerRef = db.collection('players').doc();
      playersBatch.set(playerRef, {
        name: player.name,
        phone: player.phone || '',
        annual: parseFloat(player.annual) || 0,
        monthly: parseFloat(player.monthly) || 0,
        pitch: parseFloat(player.pitch) || 0,
        matchDay: parseFloat(player.match_day) || 0,
        createdAt: player.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: player.updated_at?.toISOString() || new Date().toISOString(),
      });
      playersAdded++;

      // Commit in batches of 500
      if (playersAdded % 500 === 0) {
        await playersBatch.commit();
        console.log(`  ✓ Migrated ${playersAdded} players...`);
      }
    }

    if (playersAdded % 500 !== 0) {
      await playersBatch.commit();
    }
    console.log(`✅ Migrated ${playersAdded} players\n`);

    // Create a map of old player IDs to new Firestore IDs
    const playerIdMap = new Map<number, string>();
    const allPlayers = await db.collection('players').get();
    const pgPlayers = playersResult.rows;

    allPlayers.docs.forEach((doc, index) => {
      if (pgPlayers[index]) {
        playerIdMap.set(pgPlayers[index].id, doc.id);
      }
    });

    // Migrate Payments
    console.log('📥 Migrating payments...');
    const paymentsResult = await pool.query('SELECT * FROM payments ORDER BY id');
    let paymentsAdded = 0;

    for (const payment of paymentsResult.rows) {
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
        createdAt: payment.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: payment.updated_at?.toISOString() || new Date().toISOString(),
      });
      paymentsAdded++;

      if (paymentsAdded % 100 === 0) {
        console.log(`  ✓ Migrated ${paymentsAdded} payments...`);
      }
    }
    console.log(`✅ Migrated ${paymentsAdded} payments\n`);

    // Migrate Expenses
    console.log('📥 Migrating expenses...');
    const expensesResult = await pool.query('SELECT * FROM expenses ORDER BY id');
    let expensesAdded = 0;

    for (const expense of expensesResult.rows) {
      const expenseRef = db.collection('expenses').doc();
      await expenseRef.set({
        description: expense.description || '',
        category: expense.category || 'Other',
        amount: parseFloat(expense.amount) || 0,
        expenseDate: expense.expense_date || new Date().toISOString().split('T')[0],
        matchDayId: expense.match_day_id || null,
        createdBy: expense.created_by || '',
        createdAt: expense.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: expense.updated_at?.toISOString() || new Date().toISOString(),
      });
      expensesAdded++;

      if (expensesAdded % 100 === 0) {
        console.log(`  ✓ Migrated ${expensesAdded} expenses...`);
      }
    }
    console.log(`✅ Migrated ${expensesAdded} expenses\n`);

    // Migrate Users (without passwords - they'll need to reset)
    console.log('📥 Migrating users...');
    const usersResult = await pool.query('SELECT * FROM users ORDER BY id');
    let usersAdded = 0;

    for (const user of usersResult.rows) {
      const userRef = db.collection('users').doc();
      await userRef.set({
        name: user.name || '',
        email: user.email,
        role: user.role || 'viewer',
        status: user.status || 'active',
        passwordHash: user.password_hash || '',
        createdAt: user.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: user.updated_at?.toISOString() || new Date().toISOString(),
      });
      usersAdded++;
    }
    console.log(`✅ Migrated ${usersAdded} users\n`);

    console.log('\n✨ Migration completed successfully!\n');
    console.log('Summary:');
    console.log(`  ✓ ${playersAdded} players migrated`);
    console.log(`  ✓ ${paymentsAdded} payments migrated`);
    console.log(`  ✓ ${expensesAdded} expenses migrated`);
    console.log(`  ✓ ${usersAdded} users migrated`);
    console.log('\n⚠️  Note: User passwords were migrated as hashes. Users may need to reset passwords.\n');

    await pool.end();

  } catch (error) {
    console.error('\n❌ Migration error:', error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

migrateData();
