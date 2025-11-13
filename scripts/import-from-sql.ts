import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin using environment variables
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

interface PlayerIdMap {
  [oldId: string]: string;
}

// Parse SQL INSERT statement
function parseInsertStatement(line: string): any[] | null {
  const match = line.match(/INSERT INTO public\.\w+ VALUES \((.*)\);/);
  if (!match) return null;

  const valuesStr = match[1];
  const values: any[] = [];
  let current = '';
  let inQuote = false;
  let depth = 0;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (char === "'" && (i === 0 || valuesStr[i - 1] !== '\\')) {
      inQuote = !inQuote;
      continue;
    }

    if (!inQuote) {
      if (char === '(') depth++;
      if (char === ')') depth--;

      if (char === ',' && depth === 0) {
        values.push(parseValue(current.trim()));
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    values.push(parseValue(current.trim()));
  }

  return values;
}

function parseValue(value: string): any {
  value = value.trim();

  if (value === 'NULL') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Remove quotes
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  // Try to parse as number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value);
  }

  return value;
}

async function importData() {
  const sqlFilePath = path.join(process.env.HOME || '', 'Downloads', 'football_management_data.sql');

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`SQL file not found at: ${sqlFilePath}`);
    process.exit(1);
  }

  console.log(`Reading SQL file from: ${sqlFilePath}`);

  const fileStream = fs.createReadStream(sqlFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let currentTable = '';
  const playerIdMap: PlayerIdMap = {};
  let playersCount = 0;
  let paymentsCount = 0;
  let expensesCount = 0;
  let usersCount = 0;

  for await (const line of rl) {
    // Detect which table we're inserting into
    if (line.includes('Data for Name: players')) {
      currentTable = 'players';
      console.log('\n📦 Processing players...');
    } else if (line.includes('Data for Name: payments')) {
      currentTable = 'payments';
      console.log('\n💰 Processing payments...');
    } else if (line.includes('Data for Name: expenses')) {
      currentTable = 'expenses';
      console.log('\n💸 Processing expenses...');
    } else if (line.includes('Data for Name: users')) {
      currentTable = 'users';
      console.log('\n👥 Processing users...');
    } else if (line.includes('Data for Name: match_days')) {
      currentTable = 'match_days';
      console.log('\n⚽ Processing match days...');
    }

    // Parse INSERT statements
    if (line.trim().startsWith('INSERT INTO public.')) {
      const values = parseInsertStatement(line);
      if (!values) continue;

      try {
        if (currentTable === 'players') {
          // players: id, name, phone, annual_amount, monthly_amount, pitch_amount, match_day_amount, created_at, updated_at
          const [oldId, name, phone, annualAmount, monthlyAmount, pitchAmount, matchDayAmount, createdAt, updatedAt] = values;

          const playerRef = db.collection('players').doc();
          await playerRef.set({
            name,
            phone,
            annualAmount: annualAmount || 0,
            monthlyAmount: monthlyAmount || 0,
            pitchAmount: pitchAmount || 0,
            matchDayAmount: matchDayAmount || null,
            createdAt: createdAt ? new Date(createdAt) : new Date(),
            updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
          });

          playerIdMap[oldId] = playerRef.id;
          playersCount++;

          if (playersCount % 10 === 0) {
            process.stdout.write(`\r   Imported ${playersCount} players...`);
          }
        } else if (currentTable === 'payments') {
          // payments: id, player_id, player_name, payment_type, amount, payment_date, notes, created_at, updated_at
          const [id, oldPlayerId, playerName, paymentType, amount, paymentDate, notes, createdAt, updatedAt] = values;

          const newPlayerId = playerIdMap[oldPlayerId];
          if (!newPlayerId) {
            console.warn(`\n⚠️  Skipping payment: player ${oldPlayerId} not found`);
            continue;
          }

          await db.collection('payments').add({
            playerId: newPlayerId,
            playerName,
            paymentType,
            amount: amount || 0,
            paymentDate: paymentDate || new Date().toISOString().split('T')[0],
            notes: notes || '',
            createdAt: createdAt ? new Date(createdAt) : new Date(),
            updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
          });

          paymentsCount++;

          if (paymentsCount % 50 === 0) {
            process.stdout.write(`\r   Imported ${paymentsCount} payments...`);
          }
        } else if (currentTable === 'expenses') {
          // expenses: id, description, category, amount, expense_date, notes, user_id, created_at, updated_at
          const [id, description, category, amount, expenseDate, notes, userId, createdAt, updatedAt] = values;

          await db.collection('expenses').add({
            description,
            category,
            amount: amount || 0,
            expenseDate: expenseDate || new Date().toISOString().split('T')[0],
            notes: notes || '',
            userId: userId || '',
            createdAt: createdAt ? new Date(createdAt) : new Date(),
            updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
          });

          expensesCount++;

          if (expensesCount % 10 === 0) {
            process.stdout.write(`\r   Imported ${expensesCount} expenses...`);
          }
        } else if (currentTable === 'users') {
          // users: id, name, email, role, status, password_hash, created_at, updated_at
          const [id, name, email, role, status, passwordHash, createdAt, updatedAt] = values;

          // Skip admin users if they already exist in Firestore
          const existingUser = await db.collection('users').where('email', '==', email).limit(1).get();
          if (!existingUser.empty) {
            console.log(`\n   ⏭️  Skipping user ${email} (already exists)`);
            continue;
          }

          await db.collection('users').add({
            name,
            email,
            role,
            status: status || 'active',
            passwordHash,
            createdAt: createdAt ? new Date(createdAt) : new Date(),
            updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
          });

          usersCount++;
          console.log(`\n   ✓ Imported user: ${name} (${email})`);
        }
      } catch (error: any) {
        console.error(`\n❌ Error processing ${currentTable}:`, error.message);
      }
    }
  }

  console.log('\n\n✅ Import completed!\n');
  console.log(`📊 Summary:`);
  console.log(`   Players:  ${playersCount}`);
  console.log(`   Payments: ${paymentsCount}`);
  console.log(`   Expenses: ${expensesCount}`);
  console.log(`   Users:    ${usersCount}`);
  console.log('');
}

// Run the import
importData()
  .then(() => {
    console.log('🎉 All data imported successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
