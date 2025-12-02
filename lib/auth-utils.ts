// Authentication utilities
import { supabaseAdmin } from './supabase-admin';
import { NextRequest } from 'next/server';

export async function verifyToken(token: string) {
  try {
    // Try to decode as base64 token (from Supabase login)
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      if (decoded.userId && decoded.email && decoded.role) {
        // For now, trust the token structure since we encode user info in it
        // In production, you might want to add expiration and verify against database
        return {
          uid: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };
      }
    } catch (base64Error) {
      // Not a base64 token, might be Firebase token (for backward compatibility)
      // Try Firebase verification if available
      try {
        const { adminAuth } = await import('./firebase-admin');
        if (adminAuth) {
          const decodedToken = await adminAuth.verifyIdToken(token);
          return decodedToken;
        }
      } catch (firebaseError) {
        // Token is invalid
        console.error('Token verification failed:', firebaseError);
      }
    }

    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function getAuthUser(request: NextRequest) {
  try {
    // Allow disabling auth via environment variable for quick public access
    if (process.env.DISABLE_AUTH === 'true') {
      // Return a default admin user when auth is disabled
      return {
        uid: 'dev-system',
        email: 'dev@local',
        role: 'admin',
      };
    }
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No Authorization header or invalid format');
      return null;
    }

    const token = authHeader.substring(7);
    if (!token) {
      console.log('Token is empty');
      return null;
    }

    const decodedToken = await verifyToken(token);

    if (!decodedToken) {
      console.log('Token verification failed');
      return null;
    }

    return decodedToken;
  } catch (error) {
    console.error('Get auth user error:', error);
    return null;
  }
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function forbiddenResponse(message = 'Forbidden') {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(
  message: string,
  status = 500,
  opts?: { internal?: any; request?: NextRequest }
) {
  const body: Record<string, any> = { error: message };

  // Decide whether to include internal error information:
  // - Always include in non-production for easier debugging.
  // - In production, include only when the incoming request has header `x-debug: true`.
  let includeInternal = false;
  try {
    if (process.env.NODE_ENV !== 'production') {
      includeInternal = true;
    } else if (opts?.request && typeof opts.request.headers?.get === 'function') {
      const debugHeader = opts.request.headers.get('x-debug');
      if (debugHeader === 'true') {
        includeInternal = true;
      }
    }
  } catch (e) {
    // ignore header parsing errors and do not include internal details
  }

  if (includeInternal && opts?.internal) {
    body.internal = opts.internal;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function successResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
