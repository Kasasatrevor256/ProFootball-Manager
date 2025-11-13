# Supabase Setup Guide

This guide will help you set up Supabase tables for the Munyonyo Soccer Team project.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project created

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: Munyonyo Soccer Team
   - **Database Password**: (choose a strong password - save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Run the SQL Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Step 3: Get Your Supabase Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (for client-side)
   - **service_role key** (for server-side - keep secret!)

## Step 4: Configure Environment Variables

Create or update your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Keep your existing Firebase config if you're migrating gradually
# Or remove Firebase config if fully migrating to Supabase
```

## Step 5: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## Step 6: Create Supabase Client Files

You'll need to create:
- `lib/supabase-client.ts` - Client-side Supabase client
- `lib/supabase-admin.ts` - Server-side Supabase client (using service role)

## Step 7: Verify Tables Were Created

In Supabase dashboard:
1. Go to **Table Editor**
2. You should see these tables:
   - `users`
   - `players`
   - `match_days`
   - `payments`
   - `expenses`

## Step 8: Test the Connection

Create a test script or use the SQL Editor to verify:

```sql
-- Test query
SELECT COUNT(*) FROM players;
SELECT COUNT(*) FROM payments;
SELECT COUNT(*) FROM expenses;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM match_days;
```

## Migration from Firestore

If you're migrating from Firestore:

1. Export your Firestore data (see `EXPORT-POSTGRES-DATA.md`)
2. Use the migration scripts in the `scripts/` folder
3. Or manually import data using Supabase's import tools

## Row Level Security (RLS)

The schema includes RLS policies, but you may need to adjust them based on your authentication setup. Currently, they assume Supabase Auth is being used.

If you're using custom authentication:
- You may need to disable RLS temporarily: `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;`
- Or create custom policies based on your auth system

## Next Steps

1. Update your API routes to use Supabase instead of Firestore
2. Update the `BaseRouteHandler` to work with Supabase
3. Test all CRUD operations
4. Migrate existing data from Firestore

## Troubleshooting

### "permission denied for table"
- Check RLS policies
- Verify you're using the correct API key (service_role for admin operations)

### "relation does not exist"
- Make sure you ran the SQL schema in the correct database
- Check you're connected to the right Supabase project

### Connection issues
- Verify your `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check your API keys are correct
- Ensure your Supabase project is active

## Support

For Supabase-specific issues, check:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)

