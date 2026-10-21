import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users, organizationMembers, organizations } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name: string;
  role: string; // 'contractor', 'supplier', 'admin', 'super_admin'
  organizationId?: string;
  organizationType?: string;
  organizationName?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}


export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  try {
    let uid = '';
    let email = '';
    let name = '';
    let verifiedFirebaseToken = false;

    // Development auth token handling: strictly disabled unless ENABLE_DEV_AUTH === 'true'
    if (token.startsWith('qh_dev_')) {
      if (process.env.ENABLE_DEV_AUTH !== 'true') {
        return res.status(401).json({ error: 'Unauthorized: Development tokens are strictly disabled' });
      }
      uid = token.replace('qh_dev_', '');
    } else {
      // Verify Firebase ID Token via Firebase Admin SDK
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        if (!decodedToken.email_verified) {
          return res.status(401).json({ error: 'Email not verified' });
        }
        uid = decodedToken.uid;
        verifiedFirebaseToken = true;
        email = decodedToken.email || '';
        name = decodedToken.name || (email ? email.split('@')[0] : 'User');
      } catch (fbErr: any) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired Firebase session token' });
      }
    }

    // Look up user in PostgreSQL
    const existingUsers = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    let userRecord = existingUsers[0];

    // If new Firebase user, provision user record with authoritative default role
    if (!userRecord && email) {
      const inserted = await db.insert(users).values({
        id: uid,
        email: email.toLowerCase(),
        name: name || 'User',
        role: 'contractor', // Authoritative database role default
        status: 'active',
        lastLoginAt: new Date(),
      }).returning();
      userRecord = inserted[0];

      // Auto-provision initial contractor organization with honest pending profile (no fake phone/address)
      const orgId = 'org_' + crypto.randomUUID().slice(0, 12);
      const insertedOrg = await db.insert(organizations).values({
        id: orgId,
        name: name ? `${name}'s Organization` : 'Contractor Organization',
        type: 'contractor',
        phone: null, // No fake phone invented
        email: email.toLowerCase(),
        address: null, // No fake address invented
        city: null,
        region: 'Greater Accra',
        country: 'Ghana',
        verificationStatus: 'pending', // Strictly pending, never fake-verified
      }).returning();

      await db.insert(organizationMembers).values({
        id: 'mem_' + crypto.randomUUID().slice(0, 12),
        organizationId: insertedOrg[0].id,
        userId: uid,
        role: 'owner',
        status: 'active',
      });
    }

    if (!userRecord) {
      return res.status(401).json({ error: 'User profile not found in system' });
    }

    // Bootstrap super admin by verified Firebase UID only (never by email, never via dev tokens)
    const bootstrapUid = process.env.BOOTSTRAP_SUPER_ADMIN_UID;
    if (verifiedFirebaseToken && bootstrapUid && bootstrapUid !== 'pending' && userRecord.id === bootstrapUid && userRecord.role !== 'super_admin') {
      await db.update(users).set({ role: 'super_admin', updatedAt: new Date() }).where(eq(users.id, userRecord.id));
      userRecord.role = 'super_admin';
    }

    if (userRecord.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Please contact platform administration.' });
    }

    // Resolve organization membership strictly from database
    const requestedOrgId = req.headers['x-organization-id'] as string | undefined;

    let targetMembership = null;
    if (requestedOrgId) {
      // Validate that authenticated user actually belongs to requested organization
      const verifiedMembership = await db.select({
        member: organizationMembers,
        org: organizations,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(and(
        eq(organizationMembers.userId, uid),
        eq(organizationMembers.organizationId, requestedOrgId),
        eq(organizationMembers.status, 'active')
      ))
      .limit(1);

      if (verifiedMembership.length > 0) {
        targetMembership = verifiedMembership[0];
      }
    }

    if (!targetMembership) {
      // Use primary active organization membership
      const defaultMembership = await db.select({
        member: organizationMembers,
        org: organizations,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(and(
        eq(organizationMembers.userId, uid),
        eq(organizationMembers.status, 'active')
      ))
      .limit(1);

      targetMembership = defaultMembership[0] || null;
    }

    req.user = {
      uid: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role, // Always strictly derived from PostgreSQL database!
      organizationId: targetMembership?.org.id,
      organizationType: targetMembership?.org.type,
      organizationName: targetMembership?.org.name,
    };

    next();
  } catch (error) {
    console.error('Authentication verification error:', error);
    return res.status(401).json({ error: 'Authentication verification failed' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
  }
  next();
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Super Administrator privileges required' });
  }
  next();
};

export const requireContractor = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'contractor' && req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Forbidden: Contractor role required for this procurement action' });
  }
  next();
};

export const requireSupplier = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'supplier' && req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Forbidden: Supplier role required to submit quotations' });
  }
  next();
};
