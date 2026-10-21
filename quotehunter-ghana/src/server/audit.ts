import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import crypto from 'crypto';

export interface AuditLogParams {
  actorUserId?: string | null;
  organizationId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Server-authoritative audit logging for Republic of Ghana Act 772 & Act 843 compliance.
 * Immutable chronological trail with sanitized metadata.
 */
export async function logAuditEvent(params: AuditLogParams) {
  try {
    // Sanitize metadata to never persist sensitive tokens or secrets
    let sanitizedMetadata: Record<string, any> | null = null;
    if (params.metadata) {
      sanitizedMetadata = { ...params.metadata };
      delete sanitizedMetadata.password;
      delete sanitizedMetadata.token;
      delete sanitizedMetadata.secret;
      delete sanitizedMetadata.authorization;
    }

    await db.insert(auditLogs).values({
      id: 'aud_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16),
      actorUserId: params.actorUserId || null,
      organizationId: params.organizationId || null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: sanitizedMetadata ? JSON.stringify(sanitizedMetadata) : null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  } catch (err) {
    console.error('Failed to record security audit log:', err);
  }
}
