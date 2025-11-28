# Vercel Deployment Setup

## Required Environment Variables

Add these in **Vercel Dashboard → Settings → Environment Variables**:

### Supabase Configuration (Public)
```
NEXT_PUBLIC_SUPABASE_URL=https://vcrhhvxnuiakoyiqcugq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**To get your Supabase keys:**
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** (for `NEXT_PUBLIC_SUPABASE_URL`)
5. Copy the **anon/public** key (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Firebase Client Configuration (Public)
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA2iI3qYZez8n45ETY4n-frxWq8BVN0G9Q
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=munyonyosoccerteam.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=munyonyosoccerteam
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=munyonyosoccerteam.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=523669880033
NEXT_PUBLIC_FIREBASE_APP_ID=1:523669880033:web:3169a4f2965ca2c2748ba0
```

### Firebase Admin Configuration (Secret - Production, Preview, Development)
```
FIREBASE_PROJECT_ID=munyonyosoccerteam
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@munyonyosoccerteam.iam.gserviceaccount.com
```

### Firebase Private Key (IMPORTANT - Special Format)
For the `FIREBASE_PRIVATE_KEY`, you need to:

1. Go to your `.env.local` file
2. Copy the entire private key value INCLUDING the quotes
3. In Vercel, paste it exactly as shown in `.env.local`

**Example:**
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCuiQXNnQhTmdBw\n...(rest of key)...\n-----END PRIVATE KEY-----\n"
```

⚠️ **Make sure to include the `\n` characters - don't replace them with actual line breaks!**

## Steps to Deploy

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all variables above
5. Select environments: **Production**, **Preview**, **Development**
6. Click **Save**
7. Go to **Deployments** → Click the three dots on the latest deployment → **Redeploy**

## Verify Deployment

After redeployment:
- Check build logs for success
- Visit your deployed URL
- Test login functionality
- Verify Firebase connection

## Troubleshooting

### If you still get "project_id" error:
- Make sure `FIREBASE_PROJECT_ID` is set
- Verify there are no extra spaces in the variable value
- Ensure all three environments are checked (Production, Preview, Development)

### If you get "private key" error:
- The `FIREBASE_PRIVATE_KEY` must be in quotes
- Must contain `\n` (not actual line breaks)
- Copy-paste directly from `.env.local`

### If build succeeds but app doesn't work:
- Check Firebase Console → Authentication is enabled
- Check Firestore rules are deployed
- Verify API keys are correct
