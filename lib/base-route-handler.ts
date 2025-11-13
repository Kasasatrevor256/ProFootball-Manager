import { NextRequest } from 'next/server';
import { adminDb, ensureFirebaseInitialized } from '@/lib/firebase-admin';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse, forbiddenResponse } from '@/lib/auth-utils';
import { UserRole } from '@/lib/types';

/**
 * Base route handler class that provides common functionality for all API routes
 * All route handlers should extend this class and use super() to call parent methods
 */
export class BaseRouteHandler {
  protected request: NextRequest;
  protected authUser: any = null;

  constructor(request: NextRequest) {
    this.request = request;
  }

  /**
   * Authenticate the request and set authUser
   * Returns true if authenticated, false otherwise
   */
  protected async authenticate(): Promise<boolean> {
    this.authUser = await getAuthUser(this.request);
    return this.authUser !== null;
  }

  /**
   * Check if user is authenticated, return unauthorized response if not
   */
  protected async requireAuth() {
    const isAuthenticated = await this.authenticate();
    if (!isAuthenticated) {
      return unauthorizedResponse();
    }
    return null;
  }

  /**
   * Check if user has admin role
   */
  protected async requireAdmin() {
    const authCheck = await this.requireAuth();
    if (authCheck) return authCheck;

    const { adminDb: db } = ensureFirebaseInitialized();
    const userDoc = await db.collection('users').doc(this.authUser.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== UserRole.ADMIN) {
      return forbiddenResponse('Admin access required');
    }
    return null;
  }

  /**
   * Get query parameters from request URL
   */
  protected getQueryParams() {
    const { searchParams } = new URL(this.request.url);
    return {
      skip: parseInt(searchParams.get('skip') || '0'),
      limit: parseInt(searchParams.get('limit') || '100'),
      search: searchParams.get('search'),
      get: (key: string) => searchParams.get(key),
    };
  }

  /**
   * Parse request body as JSON
   */
  protected async getBody<T = any>(): Promise<T> {
    return await this.request.json();
  }

  /**
   * Get a document by ID from a collection
   */
  protected async getDocumentById(collectionName: string, id: string) {
    const { adminDb: db } = ensureFirebaseInitialized();
    const doc = await db.collection(collectionName).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Create a new document in a collection
   */
  protected async createDocument(collectionName: string, data: any, docId?: string) {
    const { adminDb: db } = ensureFirebaseInitialized();
    const now = new Date().toISOString();
    const documentData = {
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    };

    if (docId) {
      await db.collection(collectionName).doc(docId).set(documentData);
      return { id: docId, ...documentData };
    } else {
      const docRef = db.collection(collectionName).doc();
      await docRef.set(documentData);
      return { id: docRef.id, ...documentData };
    }
  }

  /**
   * Update a document in a collection
   */
  protected async updateDocument(collectionName: string, id: string, data: any) {
    const { adminDb: db } = ensureFirebaseInitialized();
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    await db.collection(collectionName).doc(id).update(updateData);
    return await this.getDocumentById(collectionName, id);
  }

  /**
   * Delete a document from a collection
   */
  protected async deleteDocument(collectionName: string, id: string) {
    const { adminDb: db } = ensureFirebaseInitialized();
    const doc = await db.collection(collectionName).doc(id).get();
    if (!doc.exists) {
      return false;
    }
    await db.collection(collectionName).doc(id).delete();
    return true;
  }

  /**
   * Build a query with filters
   */
  protected buildQuery(collectionName: string, filters: Record<string, any> = {}) {
    const { adminDb: db } = ensureFirebaseInitialized();
    let query: any = db.collection(collectionName);

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.where(key, '==', value);
      }
    }

    return query;
  }

  /**
   * Execute a query with pagination
   */
  protected async executeQuery(
    query: any,
    options: { skip?: number; limit?: number; orderBy?: { field: string; direction?: 'asc' | 'desc' } } = {}
  ) {
    const { skip = 0, limit = 100, orderBy } = options;

    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.direction || 'desc');
    }

    try {
      query = query.limit(limit).offset(skip);
    } catch (e) {
      console.log('⚠️ Query pagination failed, using limit only:', e);
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Handle errors with consistent logging and response
   */
  protected handleError(error: unknown, context: string) {
    console.error(`${context} error:`, error);
    return errorResponse('Internal server error', 500);
  }

  /**
   * Return success response
   */
  protected success(data: any, status = 200) {
    return successResponse(data, status);
  }

  /**
   * Return error response
   */
  protected error(message: string, status = 500) {
    return errorResponse(message, status);
  }

  /**
   * Return unauthorized response
   */
  protected unauthorized(message = 'Unauthorized') {
    return unauthorizedResponse(message);
  }

  /**
   * Return forbidden response
   */
  protected forbidden(message = 'Forbidden') {
    return forbiddenResponse(message);
  }

  /**
   * Validate required fields in body
   */
  protected validateRequired(body: any, fields: string[]): string | null {
    for (const field of fields) {
      if (!body[field] && body[field] !== 0 && body[field] !== false) {
        return `${field} is required`;
      }
    }
    return null;
  }
}

