import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import {
  users,
  organizations,
  organizationMembers,
  projects,
  materialCategories,
  materials,
  supplierProfiles,
  supplierMaterials,
  materialRequests,
  materialRequestItems,
  quotations,
  quotationItems,
  orders,
  notifications,
  auditLogs,
} from '../db/schema.ts';
import { eq, desc, and, or, inArray, sql } from 'drizzle-orm';
import {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireContractor,
  requireSupplier,
  AuthRequest,
} from '../middleware/auth.ts';
import { logAuditEvent } from './audit.ts';
import { createRateLimiter } from '../middleware/rateLimit.ts';

// Domain error classes for controlled, non-leaking error responses
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
import {
  createOrganizationSchema,
  createProjectSchema,
  createRfqSchema,
  submitQuotationSchema,
  acceptQuotationSchema,
  updateOrderStatusSchema,
  sanitizeCsvCell,
} from './validation.ts';
import {
  generateSafeRfqNumber,
  generateSafeQuoteNumber,
  generateSafeOrderNumber,
} from './numbering.ts';
import { runMigrations } from '../db/migrate.ts';

export const apiRouter = Router();

// Route-specific rate limiters
const authLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, name: 'auth-limiter' });
const rfqLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 40, name: 'rfq-limiter' });
const quoteLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60, name: 'quote-limiter' });
const boqLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20, name: 'boq-limiter' });
const adminLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60, name: 'admin-limiter' });

// ==========================================
// 1. AUTHENTICATION & ORGANIZATION SETUP
// ==========================================

// Current user profile & verified organization memberships
apiRouter.get('/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const userDb = await db.select().from(users).where(eq(users.id, user.uid)).limit(1);

    // Fetch user organizations strictly from database membership
    const memberships = await db.select({
      memberId: organizationMembers.id,
      role: organizationMembers.role,
      status: organizationMembers.status,
      org: organizations,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(
      eq(organizationMembers.userId, user.uid),
      eq(organizationMembers.status, 'active')
    ));

    // If supplier, fetch supplier profile
    let supplierProfileData = null;
    const supplierOrg = memberships.find(m => m.org.type === 'supplier');
    if (supplierOrg) {
      const sp = await db.select().from(supplierProfiles).where(eq(supplierProfiles.organizationId, supplierOrg.org.id)).limit(1);
      supplierProfileData = sp[0] || null;
    }

    res.json({
      user: userDb[0] || user,
      organizations: memberships.map(m => ({
        ...m.org,
        memberRole: m.role,
        memberStatus: m.status,
      })),
      supplierProfile: supplierProfileData,
    });
  } catch (error: any) {
    console.error('Error fetching auth user profile:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// Development/testing session endpoint (REGISTERED STRICTLY ONLY WHEN ENABLE_DEV_AUTH === 'true')
if (process.env.ENABLE_DEV_AUTH === 'true') {
  apiRouter.post('/auth/session', authLimiter, async (req: Request, res: Response) => {
    if (process.env.ENABLE_DEV_AUTH !== 'true') {
      return res.status(404).json({ error: 'Endpoint not available' });
    }

    try {
      const { email, name, role, organizationName, region } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email address is required' });
      }

    const cleanEmail = email.toLowerCase().trim();

    // In development mode, check if email matches admin identities
    const isAdminEmail = cleanEmail.includes('admin') || (process.env.BOOTSTRAP_ADMIN_EMAIL && cleanEmail === process.env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase());
    const isSupplierEmail = cleanEmail.includes('supplier');
    const assignedRole = isAdminEmail ? 'admin' : (isSupplierEmail ? 'supplier' : (role === 'supplier' ? 'supplier' : 'contractor'));

    const uid = 'usr_' + crypto.createHash('md5').update(cleanEmail).digest('hex').slice(0, 16);

    let existingUser = (await db.select().from(users).where(eq(users.id, uid)).limit(1))[0];

    if (!existingUser) {
      const insertedUser = await db.insert(users).values({
        id: uid,
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0].toUpperCase(),
        role: assignedRole,
        status: 'active',
        lastLoginAt: new Date(),
      }).returning();
      existingUser = insertedUser[0];

      const orgType = assignedRole === 'admin' ? 'admin' : assignedRole;
      const orgId = 'org_' + crypto.randomUUID().slice(0, 12);
      const insertedOrg = await db.insert(organizations).values({
        id: orgId,
        name: organizationName || (assignedRole === 'supplier' ? 'Accra Building Supplies Ltd' : assignedRole === 'admin' ? 'QuoteHunter Ghana Operations' : 'Prime Build Construction Ghana Ltd'),
        type: orgType,
        registrationNumber: 'CS' + Math.floor(100000 + Math.random() * 900000),
        tinNumber: 'P00' + Math.floor(1000000 + Math.random() * 9000000),
        phone: '+233 24 555 1234',
        email: cleanEmail,
        address: 'Spintex Road, Light Industrial Area',
        city: 'Accra',
        region: region || 'Greater Accra',
        country: 'Ghana',
        verificationStatus: 'verified',
      }).returning();

      await db.insert(organizationMembers).values({
        id: 'mem_' + crypto.randomUUID().slice(0, 12),
        organizationId: insertedOrg[0].id,
        userId: existingUser.id,
        role: 'owner',
        status: 'active',
      });

      if (assignedRole === 'supplier') {
        const suppProfileId = 'sup_' + crypto.randomUUID().slice(0, 12);
        await db.insert(supplierProfiles).values({
          id: suppProfileId,
          organizationId: insertedOrg[0].id,
          verificationStatus: 'verified',
          businessDescription: 'Certified wholesale distributor of Ghacem cement, Grade 500B rebar, and aggregate supplies across Greater Accra & Eastern Region.',
          serviceRegions: JSON.stringify(['Greater Accra', 'Eastern', 'Central', 'Ashanti']),
          warehouseAddress: 'Plot 44, Heavy Industrial Area, Tema, Greater Accra',
          rating: '4.85',
          totalQuotes: 14,
          successfulOrders: 11,
          yearsInBusiness: 6,
          deliveryFleetInfo: '6x 20m³ Tipper Trucks, 3x 30T Flatbed Trailers',
        });

        const allMats = await db.select().from(materials).limit(8);
        for (const m of allMats) {
          let price = 105;
          if (m.name.includes('Rebar 12mm')) price = 95;
          else if (m.name.includes('Rebar 16mm')) price = 168;
          else if (m.name.includes('Sand')) price = 1450;
          else if (m.name.includes('Chippings')) price = 2200;
          else if (m.name.includes('Ghacem')) price = 108;
          else if (m.name.includes('Dangote')) price = 102;
          else if (m.name.includes('Block')) price = 7;

          await db.insert(supplierMaterials).values({
            id: 'sm_' + crypto.randomUUID().slice(0, 12),
            supplierProfileId: suppProfileId,
            materialId: m.id,
            unitPriceGhs: price,
            unit: m.unit,
            minimumOrderQty: m.name.includes('Trip') ? 1 : 50,
            inStock: true,
            leadTimeDays: 1,
          });
        }
      }

      await logAuditEvent({
        actorUserId: existingUser.id,
        organizationId: insertedOrg[0].id,
        action: 'USER_REGISTERED',
        resourceType: 'user',
        resourceId: existingUser.id,
      });
    } else {
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, existingUser.id));
      await logAuditEvent({
        actorUserId: existingUser.id,
        action: 'USER_LOGIN',
        resourceType: 'user',
        resourceId: existingUser.id,
      });
    }

    const token = 'qh_dev_' + existingUser.id;
    res.json({
      token,
      user: existingUser,
    });
    } catch (error: any) {
      console.error('Session authentication failure:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });
}

// Register new organization (Validated & Transacted)
apiRouter.post('/organizations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = createOrganizationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid organization details' });
    }

    const data = parseResult.data;
    const orgId = 'org_' + crypto.randomUUID().slice(0, 12);

    const result = await db.transaction(async (tx) => {
      const newOrg = await tx.insert(organizations).values({
        id: orgId,
        name: data.name,
        type: data.type,
        registrationNumber: data.registrationNumber || null,
        tinNumber: data.tinNumber || null,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        region: data.region,
        country: 'Ghana',
        verificationStatus: 'verified', // self-serve: no manual approval; admins can still suspend
      }).returning();

      // Link user as owner
      await tx.insert(organizationMembers).values({
        id: 'mem_' + crypto.randomUUID().slice(0, 12),
        organizationId: orgId,
        userId: req.user!.uid,
        role: 'owner',
        status: 'active',
      });

      if (data.type === 'supplier') {
        await tx.insert(supplierProfiles).values({
          id: 'sup_' + crypto.randomUUID().slice(0, 12),
          organizationId: orgId,
          verificationStatus: 'verified', // self-serve: no manual approval; admins can still suspend
          businessDescription: data.businessDescription || '',
          serviceRegions: JSON.stringify(data.serviceRegions || [data.region]),
          rating: '0.00',
          totalQuotes: 0,
          successfulOrders: 0,
          yearsInBusiness: 1,
        });

        // Update user role to supplier if currently contractor
        if (req.user!.role === 'contractor') {
          await tx.update(users).set({ role: 'supplier' }).where(eq(users.id, req.user!.uid));
        }
      }

      return newOrg[0];
    });

    await logAuditEvent({
      actorUserId: req.user!.uid,
      organizationId: orgId,
      action: 'ORGANIZATION_CREATED',
      resourceType: 'organization',
      resourceId: orgId,
      metadata: { type: data.type, name: data.name },
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Organization creation error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// ==========================================
// 2. MATERIALS & CATALOG API
// ==========================================

apiRouter.get('/materials/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await db.select().from(materialCategories);
    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

apiRouter.get('/materials', async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.category_id as string | undefined;
    const search = req.query.search as string | undefined;

    const results = await db.select({
      id: materials.id,
      name: materials.name,
      unit: materials.unit,
      description: materials.description,
      standardSpec: materials.standardSpec,
      categoryId: materials.categoryId,
      categoryName: materialCategories.name,
    })
    .from(materials)
    .innerJoin(materialCategories, eq(materials.categoryId, materialCategories.id));

    let filtered = results;
    if (categoryId) {
      filtered = filtered.filter(m => m.categoryId === categoryId);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(m => m.name.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
    }

    res.json(filtered);
  } catch (error: any) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// ==========================================
// 3. CONTRACTOR PROJECTS (IDOR & ROLE PROTECTED)
// ==========================================

apiRouter.get('/projects', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    if (!orgId) {
      return res.json([]);
    }

    const orgProjects = await db.select()
      .from(projects)
      .where(and(
        eq(projects.organizationId, orgId),
        sql`${projects.deletedAt} IS NULL`
      ))
      .orderBy(desc(projects.createdAt));

    res.json(orgProjects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

apiRouter.post('/projects', requireAuth, requireContractor, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization membership required to create projects' });
    }

    const parseResult = createProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid project input' });
    }

    const data = parseResult.data;
    const projectId = 'prj_' + crypto.randomUUID().slice(0, 12);

    let parsedBudget: number | null = null;
    if (data.estimatedBudget !== undefined && data.estimatedBudget !== null) {
      const b = typeof data.estimatedBudget === 'string' ? parseInt(data.estimatedBudget, 10) : data.estimatedBudget;
      if (!isNaN(b) && b > 0) parsedBudget = b;
    }

    const newProject = await db.insert(projects).values({
      id: projectId,
      organizationId: orgId,
      name: data.name,
      description: data.description || null,
      location: data.location,
      region: data.region,
      status: 'active',
      startDate: data.startDate || null,
      expectedCompletionDate: data.expectedCompletionDate || null,
      estimatedBudget: parsedBudget,
      budgetCurrency: 'GHS',
    }).returning();

    await logAuditEvent({
      actorUserId: req.user!.uid,
      organizationId: orgId,
      action: 'PROJECT_CREATED',
      resourceType: 'project',
      resourceId: projectId,
      metadata: { name: data.name, region: data.region },
    });

    res.status(201).json(newProject[0]);
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// ==========================================
// 4. MATERIAL REQUESTS (RFQS) & BOQ IMPORT
// ==========================================

apiRouter.get('/rfqs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user!.role;
    const orgId = req.user!.organizationId;

    if (userRole === 'admin' || userRole === 'super_admin') {
      const allRfqs = await db.select({
        rfq: materialRequests,
        project: projects,
        org: organizations,
      })
      .from(materialRequests)
      .innerJoin(projects, eq(materialRequests.projectId, projects.id))
      .innerJoin(organizations, eq(materialRequests.organizationId, organizations.id))
      .where(sql`${materialRequests.deletedAt} IS NULL`)
      .orderBy(desc(materialRequests.createdAt));

      return res.json(allRfqs.map(r => ({ ...r.rfq, project: r.project, organization: r.org })));
    }

    if (userRole === 'supplier') {
      // Suppliers view active RFQs open for bidding without leaking competing quotations
      const openRfqs = await db.select({
        rfq: materialRequests,
        project: projects,
        contractor: organizations,
      })
      .from(materialRequests)
      .innerJoin(projects, eq(materialRequests.projectId, projects.id))
      .innerJoin(organizations, eq(materialRequests.organizationId, organizations.id))
      .where(and(
        sql`${materialRequests.deletedAt} IS NULL`,
        or(eq(materialRequests.status, 'open'), eq(materialRequests.status, 'reviewing'))
      ))
      .orderBy(desc(materialRequests.createdAt));

      return res.json(openRfqs.map(r => ({
        ...r.rfq,
        project: { name: r.project.name, location: r.project.location, region: r.project.region },
        organization: { name: r.contractor.name },
      })));
    }

    // Default: Contractor views only their organization's RFQs
    if (!orgId) return res.json([]);

    const contractorRfqs = await db.select({
      rfq: materialRequests,
      project: projects,
    })
    .from(materialRequests)
    .innerJoin(projects, eq(materialRequests.projectId, projects.id))
    .where(and(
      eq(materialRequests.organizationId, orgId),
      sql`${materialRequests.deletedAt} IS NULL`
    ))
    .orderBy(desc(materialRequests.createdAt));

    const rfqIds = contractorRfqs.map(r => r.rfq.id);
    let quoteCounts: Record<string, number> = {};
    if (rfqIds.length > 0) {
      const quotes = await db.select({
        rfqId: quotations.materialRequestId,
        count: sql<number>`count(${quotations.id})::int`,
      })
      .from(quotations)
      .where(inArray(quotations.materialRequestId, rfqIds))
      .groupBy(quotations.materialRequestId);

      quotes.forEach(q => { quoteCounts[q.rfqId] = q.count; });
    }

    res.json(contractorRfqs.map(r => ({
      ...r.rfq,
      project: r.project,
      quotesReceivedCount: quoteCounts[r.rfq.id] || 0,
    })));
  } catch (error: any) {
    console.error('Error fetching RFQs:', error);
    res.status(500).json({ error: 'Failed to fetch RFQs' });
  }
});

// Single RFQ detail with strict data isolation
apiRouter.get('/rfqs/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rfqId = req.params.id;
    const rfqResult = await db.select({
      rfq: materialRequests,
      project: projects,
      contractor: organizations,
    })
    .from(materialRequests)
    .innerJoin(projects, eq(materialRequests.projectId, projects.id))
    .innerJoin(organizations, eq(materialRequests.organizationId, organizations.id))
    .where(and(
      eq(materialRequests.id, rfqId),
      sql`${materialRequests.deletedAt} IS NULL`
    ))
    .limit(1);

    if (!rfqResult.length) {
      return res.status(404).json({ error: 'Material request not found' });
    }

    const { rfq, project, contractor } = rfqResult[0];

    // Authorization check: Contractor must own the RFQ (unless admin or supplier viewing open RFQ)
    const isOwner = req.user!.organizationId === rfq.organizationId;
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
    const isSupplier = req.user!.role === 'supplier';

    if (!isOwner && !isAdmin && !isSupplier) {
      return res.status(403).json({ error: 'Unauthorized to view this material request' });
    }

    // Limit what suppliers can read: only open/reviewing RFQs or RFQs they've already quoted on
    if (isSupplier && !isOwner && !isAdmin) {
      const isAllowedStatus = rfq.status === 'open' || rfq.status === 'reviewing';
      const hasQuoted = await db.select({ id: quotations.id })
        .from(quotations)
        .where(and(
          eq(quotations.materialRequestId, rfqId),
          eq(quotations.supplierOrganizationId, req.user!.organizationId || '')
        ))
        .limit(1);

      if (!isAllowedStatus && hasQuoted.length === 0) {
        return res.status(403).json({ error: 'Forbidden: Suppliers can only view open/reviewing RFQs or RFQs they have submitted quotations for' });
      }
    }

    // Fetch line items
    const items = await db.select().from(materialRequestItems).where(eq(materialRequestItems.materialRequestId, rfqId));

    // Quotations visibility rule:
    // - Contractor owner or Admin: Sees all submitted quotations
    // - Supplier: Sees ONLY their own quotation (never competitors!)
    let rfqQuotes: any[] = [];
    if (isOwner || isAdmin) {
      rfqQuotes = await db.select({
        quote: quotations,
        supplierOrg: organizations,
        supplierProfile: supplierProfiles,
      })
      .from(quotations)
      .innerJoin(organizations, eq(quotations.supplierOrganizationId, organizations.id))
      .innerJoin(supplierProfiles, eq(quotations.supplierProfileId, supplierProfiles.id))
      .where(eq(quotations.materialRequestId, rfqId))
      .orderBy(quotations.totalGhs);
    } else if (isSupplier && req.user!.organizationId) {
      rfqQuotes = await db.select({
        quote: quotations,
        supplierOrg: organizations,
        supplierProfile: supplierProfiles,
      })
      .from(quotations)
      .innerJoin(organizations, eq(quotations.supplierOrganizationId, organizations.id))
      .innerJoin(supplierProfiles, eq(quotations.supplierProfileId, supplierProfiles.id))
      .where(and(
        eq(quotations.materialRequestId, rfqId),
        eq(quotations.supplierOrganizationId, req.user!.organizationId)
      ));
    }

    // Remove budget and private project fields from supplier responses
    const sanitizedProject = (isSupplier && !isOwner && !isAdmin) ? {
      id: project.id,
      name: project.name,
      location: project.location,
      region: project.region,
    } : project;

    const sanitizedRfq = (isSupplier && !isOwner && !isAdmin) ? {
      id: rfq.id,
      projectId: rfq.projectId,
      organizationId: rfq.organizationId,
      requestNumber: rfq.requestNumber,
      title: rfq.title,
      deliveryLocation: rfq.deliveryLocation,
      deliveryRegion: rfq.deliveryRegion,
      deadline: rfq.deadline,
      requiredDeliveryDate: rfq.requiredDeliveryDate,
      notes: rfq.notes,
      status: rfq.status,
      createdAt: rfq.createdAt,
    } : rfq;

    res.json({
      ...sanitizedRfq,
      project: sanitizedProject,
      contractor: {
        id: contractor.id,
        name: contractor.name,
        city: contractor.city,
        region: contractor.region,
      },
      items,
      quotations: rfqQuotes.map(q => ({
        ...q.quote,
        supplier: {
          id: q.supplierOrg.id,
          name: q.supplierOrg.name,
          phone: q.supplierOrg.phone,
          city: q.supplierOrg.city,
          region: q.supplierOrg.region,
          verificationStatus: q.supplierProfile.verificationStatus,
          rating: q.supplierProfile.rating,
          successfulOrders: q.supplierProfile.successfulOrders,
          yearsInBusiness: q.supplierProfile.yearsInBusiness,
        },
      })),
    });
  } catch (error: any) {
    console.error('Error fetching RFQ detail:', error);
    res.status(500).json({ error: 'Failed to retrieve RFQ details' });
  }
});

// Create RFQ with transaction and atomic sequence generation
apiRouter.post('/rfqs', requireAuth, requireContractor, rfqLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization membership required to create an RFQ' });
    }

    const parseResult = createRfqSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid RFQ input' });
    }

    const data = parseResult.data;

    // Verify contractor owns the project (Prevent IDOR)
    const projectCheck = await db.select().from(projects).where(and(
      eq(projects.id, data.projectId),
      eq(projects.organizationId, orgId),
      sql`${projects.deletedAt} IS NULL`
    )).limit(1);

    if (!projectCheck.length) {
      return res.status(403).json({ error: 'Unauthorized: Project does not belong to your organization' });
    }

    const requestNumber = await generateSafeRfqNumber();
    const rfqId = 'rfq_' + crypto.randomUUID().slice(0, 12);

    const insertedRfq = await db.transaction(async (tx) => {
      const rfqRecord = await tx.insert(materialRequests).values({
        id: rfqId,
        projectId: data.projectId,
        organizationId: orgId,
        createdByUserId: req.user!.uid,
        requestNumber,
        title: data.title,
        deliveryLocation: data.deliveryLocation,
        deliveryRegion: data.deliveryRegion,
        deadline: data.deadline,
        requiredDeliveryDate: data.requiredDeliveryDate || null,
        notes: data.notes || null,
        status: 'open',
      }).returning();

      for (const item of data.items) {
        await tx.insert(materialRequestItems).values({
          id: 'itm_' + crypto.randomUUID().slice(0, 12),
          materialRequestId: rfqId,
          materialId: item.materialId || null,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          specification: item.specification || null,
          notes: item.notes || null,
        });
      }

      return rfqRecord[0];
    });

    await logAuditEvent({
      actorUserId: req.user!.uid,
      organizationId: orgId,
      action: 'RFQ_CREATED',
      resourceType: 'material_request',
      resourceId: rfqId,
      metadata: { requestNumber, title: data.title, itemsCount: data.items.length },
    });

    res.status(201).json(insertedRfq);
  } catch (error: any) {
    console.error('Error creating RFQ:', error);
    res.status(500).json({ error: 'Failed to create RFQ' });
  }
});

// BOQ CSV Parsing with Formula Injection Protection & Row Limit
apiRouter.post('/rfqs/parse-boq', requireAuth, requireContractor, boqLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ error: 'Valid CSV content string is required' });
    }

    if (csvContent.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'CSV file exceeds maximum allowed size (2MB)' });
    }

    const catalog = await db.select().from(materials);

    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file must contain a header row and at least one data row' });
    }

    if (lines.length > 500) {
      return res.status(400).json({ error: 'CSV file exceeds maximum limit of 500 lines' });
    }

    const headers = lines[0].split(',').map(h => sanitizeCsvCell(h).toLowerCase().replace(/["']/g, ''));
    
    const itemIndex = headers.findIndex(h => h.includes('item') || h.includes('description') || h.includes('material'));
    const qtyIndex = headers.findIndex(h => h.includes('qty') || h.includes('quantity'));
    const unitIndex = headers.findIndex(h => h.includes('unit'));
    const specIndex = headers.findIndex(h => h.includes('spec') || h.includes('standard') || h.includes('grade'));

    if (itemIndex === -1 || qtyIndex === -1) {
      return res.status(400).json({ error: 'Could not detect required columns. CSV must include Item/Description and Quantity columns.' });
    }

    const parsedItems: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
      const cleanRow = row.map(cell => sanitizeCsvCell(cell.replace(/^"(.*)"$/, '$1')));
      
      const itemName = cleanRow[itemIndex];
      const rawQty = cleanRow[qtyIndex];
      const unit = unitIndex !== -1 && cleanRow[unitIndex] ? cleanRow[unitIndex] : 'Piece';
      const spec = specIndex !== -1 && cleanRow[specIndex] ? cleanRow[specIndex] : '';

      if (!itemName || !rawQty) continue;

      const qty = parseInt(rawQty.replace(/[^\d]/g, ''), 10);
      if (isNaN(qty) || qty <= 0 || qty > 1000000) continue;

      const itemLower = itemName.toLowerCase();
      let matchedMaterial = catalog.find(m => 
        itemLower.includes(m.name.toLowerCase()) || 
        m.name.toLowerCase().includes(itemLower)
      );

      if (!matchedMaterial) {
        if (itemLower.includes('cement')) {
          matchedMaterial = catalog.find(m => m.id === 'mat_cem_ghacem42');
        } else if (itemLower.includes('12mm') || itemLower.includes('12 mm')) {
          matchedMaterial = catalog.find(m => m.id === 'mat_stl_rebar12');
        } else if (itemLower.includes('16mm') || itemLower.includes('16 mm')) {
          matchedMaterial = catalog.find(m => m.id === 'mat_stl_rebar16');
        } else if (itemLower.includes('sand')) {
          matchedMaterial = catalog.find(m => m.id === 'mat_agg_sandsharp');
        } else if (itemLower.includes('chipping') || itemLower.includes('gravel')) {
          matchedMaterial = catalog.find(m => m.id === 'mat_agg_chip34');
        } else if (itemLower.includes('block')) {
          matchedMaterial = catalog.find(m => m.id === 'mat_blk_solid06');
        }
      }

      parsedItems.push({
        itemName,
        quantity: qty,
        unit: matchedMaterial ? matchedMaterial.unit : unit,
        specification: spec || (matchedMaterial ? matchedMaterial.standardSpec : ''),
        materialId: matchedMaterial ? matchedMaterial.id : null,
        confidence: matchedMaterial ? 'matched' : 'unmatched',
      });
    }

    res.json({
      success: true,
      totalRows: lines.length - 1,
      parsedCount: parsedItems.length,
      items: parsedItems,
    });
  } catch (error: any) {
    console.error('BOQ parse error:', error);
    res.status(500).json({ error: 'Failed to parse BOQ CSV' });
  }
});

// ==========================================
// 5. SUPPLIER QUOTATION SUBMISSION & ACCEPTANCE
// ==========================================

// Submit quotation with strict role check, database quantity enforcement, and server calculations
apiRouter.post('/rfqs/:id/quotations', requireAuth, requireSupplier, quoteLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const rfqId = req.params.id;
    const orgId = req.user!.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Supplier organization membership required' });
    }

    const suppProfile = await db.select().from(supplierProfiles).where(eq(supplierProfiles.organizationId, orgId)).limit(1);
    if (!suppProfile.length) {
      return res.status(403).json({ error: 'Only registered supplier profiles can submit quotations' });
    }

    if (suppProfile[0].verificationStatus !== 'verified') {
      return res.status(403).json({ error: 'Forbidden: Only verified suppliers can submit quotations' });
    }

    const rfqCheck = await db.select().from(materialRequests).where(and(
      eq(materialRequests.id, rfqId),
      sql`${materialRequests.deletedAt} IS NULL`
    )).limit(1);

    if (!rfqCheck.length) {
      return res.status(404).json({ error: 'Material request not found' });
    }

    if (rfqCheck[0].organizationId === orgId) {
      return res.status(403).json({ error: 'Self-bidding prohibited: You cannot quote on your own organization’s RFQ' });
    }

    if (rfqCheck[0].status !== 'open' && rfqCheck[0].status !== 'reviewing') {
      return res.status(400).json({ error: 'This RFQ is closed and no longer accepting quotations' });
    }

    const parseResult = submitQuotationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid quotation input' });
    }

    const data = parseResult.data;

    // Fetch legitimate RFQ items from DB to enforce authoritative quantities
    const rfqItems = await db.select().from(materialRequestItems).where(eq(materialRequestItems.materialRequestId, rfqId));
    const rfqItemMap = new Map(rfqItems.map(i => [i.id, i]));

    let calculatedSubtotal = 0;
    const validatedItems: Array<{
      materialRequestItemId: string;
      unitPriceGhs: number;
      quantity: number;
      subtotalGhs: number;
      isAvailable: boolean;
      leadTime: string;
      notes: string;
    }> = [];

    for (const item of data.items) {
      const dbItem = rfqItemMap.get(item.materialRequestItemId);
      if (!dbItem) continue;

      const unitPrice = Math.max(1, Math.floor(item.unitPriceGhs));
      const quantity = dbItem.quantity; // AUTHORITATIVE: from database!
      const lineSubtotal = unitPrice * quantity; // Strict server calculation

      calculatedSubtotal += lineSubtotal;
      validatedItems.push({
        materialRequestItemId: dbItem.id,
        unitPriceGhs: unitPrice,
        quantity,
        subtotalGhs: lineSubtotal,
        isAvailable: item.isAvailable !== false,
        leadTime: item.leadTime || `${data.leadTimeDays} days`,
        notes: item.notes || '',
      });
    }

    if (validatedItems.length === 0) {
      return res.status(400).json({ error: 'Quotation must include at least one valid line item from this RFQ' });
    }

    const deliveryCost = Math.max(0, Math.floor(data.deliveryCostGhs));
    const calculatedTotal = calculatedSubtotal + deliveryCost;

    const quoteNumber = await generateSafeQuoteNumber();
    const quoteId = 'quo_' + crypto.randomUUID().slice(0, 12);

    const insertedQuote = await db.transaction(async (tx) => {
      const quoteRecord = await tx.insert(quotations).values({
        id: quoteId,
        materialRequestId: rfqId,
        supplierProfileId: suppProfile[0].id,
        supplierOrganizationId: orgId,
        quoteNumber,
        status: 'submitted',
        subtotalGhs: calculatedSubtotal,
        deliveryCostGhs: deliveryCost,
        taxAmountGhs: 0,
        totalGhs: calculatedTotal,
        currency: 'GHS',
        validityDate: data.validityDate,
        leadTimeDays: data.leadTimeDays,
        paymentTerms: data.paymentTerms || 'Payment upon delivery inspection',
        notes: data.notes || null,
      }).returning();

      for (const vItem of validatedItems) {
        await tx.insert(quotationItems).values({
          id: 'qit_' + crypto.randomUUID().slice(0, 12),
          quotationId: quoteId,
          materialRequestItemId: vItem.materialRequestItemId,
          unitPriceGhs: vItem.unitPriceGhs,
          quantity: vItem.quantity,
          subtotalGhs: vItem.subtotalGhs,
          isAvailable: vItem.isAvailable,
          leadTime: vItem.leadTime,
          notes: vItem.notes,
        });
      }

      await tx.update(supplierProfiles)
        .set({ totalQuotes: suppProfile[0].totalQuotes + 1 })
        .where(eq(supplierProfiles.id, suppProfile[0].id));

      return quoteRecord[0];
    });

    // Notify contractor of quotation receipt
    await db.insert(notifications).values({
      id: 'not_' + crypto.randomUUID().slice(0, 12),
      userId: rfqCheck[0].createdByUserId,
      organizationId: rfqCheck[0].organizationId,
      type: 'quote_received',
      title: `New Quotation Received: ${quoteNumber}`,
      body: `A supplier has submitted a quotation of GH₵ ${calculatedTotal.toLocaleString()} for ${rfqCheck[0].title}.`,
      link: `/rfqs/${rfqId}`,
    });

    await logAuditEvent({
      actorUserId: req.user!.uid,
      organizationId: orgId,
      action: 'QUOTE_SUBMITTED',
      resourceType: 'quotation',
      resourceId: quoteId,
      metadata: { quoteNumber, rfqId, totalGhs: calculatedTotal },
    });

    res.status(201).json(insertedQuote);
  } catch (error: any) {
    console.error('Error submitting quotation:', error);
    res.status(500).json({ error: 'Failed to submit quotation' });
  }
});

// Compare quotations for an RFQ (Protected by contractor ownership)
apiRouter.get('/rfqs/:id/comparison-matrix', requireAuth, requireContractor, async (req: AuthRequest, res: Response) => {
  try {
    const rfqId = req.params.id;
    const rfq = (await db.select().from(materialRequests).where(and(
      eq(materialRequests.id, rfqId),
      sql`${materialRequests.deletedAt} IS NULL`
    )).limit(1))[0];

    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

    // Strict authorization: Contractor must own the RFQ or be admin
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin' && req.user!.organizationId !== rfq.organizationId) {
      return res.status(403).json({ error: 'Forbidden: Unauthorized to view quotation comparison for this RFQ' });
    }

    const items = await db.select().from(materialRequestItems).where(eq(materialRequestItems.materialRequestId, rfqId));
    const quotes = await db.select({
      quote: quotations,
      supplierOrg: organizations,
      profile: supplierProfiles,
    })
    .from(quotations)
    .innerJoin(organizations, eq(quotations.supplierOrganizationId, organizations.id))
    .innerJoin(supplierProfiles, eq(quotations.supplierProfileId, supplierProfiles.id))
    .where(eq(quotations.materialRequestId, rfqId))
    .orderBy(quotations.totalGhs);

    const quoteIds = quotes.map(q => q.quote.id);
    let quoteItemsList: any[] = [];
    if (quoteIds.length > 0) {
      quoteItemsList = await db.select().from(quotationItems).where(inArray(quotationItems.quotationId, quoteIds));
    }

    const matrix = items.map(item => {
      const supplierOffers: Record<string, any> = {};
      quotes.forEach(q => {
        const lineItem = quoteItemsList.find(qi => qi.quotationId === q.quote.id && qi.materialRequestItemId === item.id);
        supplierOffers[q.quote.id] = {
          unitPriceGhs: lineItem ? lineItem.unitPriceGhs : null,
          subtotalGhs: lineItem ? lineItem.subtotalGhs : null,
          isAvailable: lineItem ? lineItem.isAvailable : false,
          notes: lineItem ? lineItem.notes : '',
        };
      });
      return {
        item,
        supplierOffers,
      };
    });

    res.json({
      rfq,
      items,
      suppliers: quotes.map(q => ({
        quoteId: q.quote.id,
        quoteNumber: q.quote.quoteNumber,
        status: q.quote.status,
        subtotalGhs: q.quote.subtotalGhs,
        deliveryCostGhs: q.quote.deliveryCostGhs,
        totalGhs: q.quote.totalGhs,
        leadTimeDays: q.quote.leadTimeDays,
        validityDate: q.quote.validityDate,
        paymentTerms: q.quote.paymentTerms,
        supplierId: q.supplierOrg.id,
        supplierName: q.supplierOrg.name,
        verificationStatus: q.profile.verificationStatus,
        rating: q.profile.rating,
        totalOrders: q.profile.successfulOrders,
      })),
      matrix,
    });
  } catch (error: any) {
    console.error('Error fetching quote comparison:', error);
    res.status(500).json({ error: 'Failed to build comparison matrix' });
  }
});

// Accept a quotation (CRITICAL TRANSACTIONAL CONCURRENCY-SAFE ACCEPTANCE)
apiRouter.post('/quotations/:id/accept', requireAuth, requireContractor, async (req: AuthRequest, res: Response) => {
  try {
    const quoteId = req.params.id;
    const orgId = req.user!.organizationId;

    const parseResult = acceptQuotationSchema.safeParse(req.body);
    const data = parseResult.success ? parseResult.data : {};

    // Execute acceptance in an atomic database transaction
    const finalOrder = await db.transaction(async (tx) => {
      // 1. Fetch quotation and verify current status
      const quoteCheck = await tx.select().from(quotations).where(eq(quotations.id, quoteId)).limit(1);
      if (!quoteCheck.length) {
        throw new NotFoundError('Quotation not found');
      }

      const quote = quoteCheck[0];
      if (quote.status !== 'submitted') {
        throw new ConflictError(`Quotation is in '${quote.status}' state and is not eligible for acceptance`);
      }

      // 2. Fetch parent RFQ and lock row with .for('update')
      const rfqCheck = await tx.select().from(materialRequests).where(eq(materialRequests.id, quote.materialRequestId)).for('update').limit(1);
      if (!rfqCheck.length) {
        throw new NotFoundError('Associated material request not found');
      }

      const rfq = rfqCheck[0];

      // 3. Authorization check
      if (rfq.organizationId !== orgId && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
        throw new ForbiddenError('Unauthorized: Only the requesting contractor can accept this quotation');
      }

      // 4. Concurrency Guard: Conditional update ensuring RFQ is still open/reviewing
      const updatedRfq = await tx.update(materialRequests)
        .set({ status: 'awarded', updatedAt: new Date() })
        .where(and(
          eq(materialRequests.id, rfq.id),
          inArray(materialRequests.status, ['open', 'reviewing'])
        ))
        .returning();

      if (updatedRfq.length === 0) {
        throw new ConflictError('This RFQ has already been awarded or closed. Duplicate acceptance blocked.');
      }

      // 5. Update accepted quotation status
      await tx.update(quotations).set({ status: 'accepted', updatedAt: new Date() }).where(eq(quotations.id, quoteId));

      // 6. Mark other competing quotations for this RFQ as rejected
      await tx.update(quotations)
        .set({ status: 'rejected', updatedAt: new Date() })
        .where(and(eq(quotations.materialRequestId, rfq.id), sql`${quotations.id} != ${quoteId}`));

      // 7. Generate safe order number
      const orderNumber = await generateSafeOrderNumber();
      const orderId = 'ord_' + crypto.randomUUID().slice(0, 12);

      // 8. Insert formal Order
      const insertedOrder = await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        quotationId: quote.id,
        materialRequestId: rfq.id,
        buyerOrganizationId: rfq.organizationId,
        supplierOrganizationId: quote.supplierOrganizationId,
        status: 'placed',
        totalAmountGhs: quote.totalGhs,
        currency: 'GHS',
        deliveryAddress: data.deliveryAddress || rfq.deliveryLocation,
        deliveryRegion: data.deliveryRegion || rfq.deliveryRegion,
        deliveryContactName: data.contactName || req.user!.name,
        deliveryContactPhone: data.contactPhone || '+233 24 000 0000',
        scheduledDeliveryDate: data.scheduledDate || null,
        notes: data.notes || null,
      }).returning();

      return insertedOrder[0];
    });

    // Notify supplier organization user(s) of order award
    const supplierMembers = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, finalOrder.supplierOrganizationId));

    if (supplierMembers.length > 0) {
      for (const member of supplierMembers) {
        await db.insert(notifications).values({
          id: 'not_' + crypto.randomUUID().slice(0, 12),
          userId: member.userId,
          organizationId: finalOrder.supplierOrganizationId,
          type: 'quote_accepted',
          title: `Order Awarded: ${finalOrder.orderNumber}`,
          body: `Your quotation for GH₵ ${finalOrder.totalAmountGhs.toLocaleString()} was accepted. Order has been generated.`,
          link: `/orders/${finalOrder.id}`,
        });
      }
    }

    // Confirmation notification for contractor
    await db.insert(notifications).values({
      id: 'not_' + crypto.randomUUID().slice(0, 12),
      userId: req.user!.uid,
      organizationId: orgId,
      type: 'order_placed',
      title: `Order Placed: ${finalOrder.orderNumber}`,
      body: `You accepted quotation and created order ${finalOrder.orderNumber} for GH₵ ${finalOrder.totalAmountGhs.toLocaleString()}.`,
      link: `/orders/${finalOrder.id}`,
    });

    await logAuditEvent({
      actorUserId: req.user!.uid,
      organizationId: orgId,
      action: 'QUOTE_ACCEPTED',
      resourceType: 'order',
      resourceId: finalOrder.id,
      metadata: { quoteId, orderNumber: finalOrder.orderNumber, totalGhs: finalOrder.totalAmountGhs },
    });

    res.json({
      success: true,
      order: finalOrder,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Error accepting quotation:', error);
    res.status(500).json({ error: 'Failed to process quotation acceptance' });
  }
});

// ==========================================
// 6. ORDERS & FULFILLMENT TRACKING (IDOR PROTECTED)
// ==========================================

apiRouter.get('/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const role = req.user!.role;

    if (role === 'admin' || role === 'super_admin') {
      const allOrders = await db.select({
        order: orders,
        buyer: organizations,
      })
      .from(orders)
      .innerJoin(organizations, eq(orders.buyerOrganizationId, organizations.id))
      .orderBy(desc(orders.createdAt));

      return res.json(allOrders.map(o => ({ ...o.order, buyer: o.buyer })));
    }

    if (!orgId) return res.json([]);

    // Data isolation: Only return orders where user org is either the buyer or supplier
    const userOrders = await db.select({
      order: orders,
      buyer: organizations,
    })
    .from(orders)
    .innerJoin(organizations, eq(orders.buyerOrganizationId, organizations.id))
    .where(or(
      eq(orders.buyerOrganizationId, orgId),
      eq(orders.supplierOrganizationId, orgId)
    ))
    .orderBy(desc(orders.createdAt));

    res.json(userOrders.map(o => ({ ...o.order, buyer: o.buyer })));
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

apiRouter.patch('/orders/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const orgId = req.user!.organizationId;

    const parseResult = updateOrderStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid status data' });
    }

    const { status, scheduledDeliveryDate, actualDeliveryDate, notes } = parseResult.data;

    const orderResult = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!orderResult.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult[0];

    // Authorization: Must belong to supplier, buyer, or admin
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
    const isSupplier = order.supplierOrganizationId === orgId;
    const isBuyer = order.buyerOrganizationId === orgId;

    if (!isAdmin && !isSupplier && !isBuyer) {
      return res.status(403).json({ error: 'Forbidden: Unauthorized to update this order' });
    }

    // Strict State Machine: Validate order status progression
    const VALID_TRANSITIONS: Record<string, string[]> = {
      placed: ['confirmed', 'cancelled'],
      confirmed: ['in_transit', 'cancelled'],
      in_transit: ['delivered'],
      delivered: ['completed'],
      completed: [],
      cancelled: [],
    };

    const allowedNext = VALID_TRANSITIONS[order.status] || [];
    const isNormallyAllowed = allowedNext.includes(status);
    const hasNormalRole = (status === 'confirmed' && isSupplier) ||
                          (status === 'in_transit' && isSupplier) ||
                          (status === 'delivered' && (isSupplier || isBuyer)) ||
                          (status === 'completed' && isBuyer) ||
                          (status === 'cancelled' && (isSupplier || isBuyer));

    // Enforce role and state machine transitions for non-admin users
    if (!isAdmin) {
      if (!isNormallyAllowed) {
        return res.status(400).json({
          error: `Invalid status transition from '${order.status}' to '${status}'. Allowed transitions: [${allowedNext.join(', ')}]`,
        });
      }
      if (!hasNormalRole) {
        return res.status(403).json({
          error: `Forbidden: As a ${isSupplier ? 'supplier' : isBuyer ? 'buyer' : 'user'}, you cannot transition order from '${order.status}' to '${status}'.`,
        });
      }
    }

    // Explicitly identify if this transition constitutes an administrative override
    const isOverride = isAdmin && (!isNormallyAllowed || !hasNormalRole);

    const updated = await db.update(orders).set({
      status,
      scheduledDeliveryDate: scheduledDeliveryDate !== undefined ? scheduledDeliveryDate : order.scheduledDeliveryDate,
      actualDeliveryDate: actualDeliveryDate !== undefined ? actualDeliveryDate : order.actualDeliveryDate,
      notes: notes !== undefined ? notes : order.notes,
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId)).returning();

    if (status === 'completed' && order.status !== 'completed') {
      const sp = await db.select().from(supplierProfiles).where(eq(supplierProfiles.organizationId, order.supplierOrganizationId)).limit(1);
      if (sp.length) {
        await db.update(supplierProfiles).set({
          successfulOrders: sp[0].successfulOrders + 1,
        }).where(eq(supplierProfiles.id, sp[0].id));
      }
    }

    // Explicitly audit administrative overrides separately from standard lifecycle updates
    await logAuditEvent({
      actorUserId: req.user!.uid,
      organizationId: orgId,
      action: isOverride ? 'ORDER_STATUS_OVERRIDE' : 'ORDER_STATUS_UPDATED',
      resourceType: 'order',
      resourceId: orderId,
      metadata: {
        previousStatus: order.status,
        newStatus: status,
        isOverride,
        actorRole: req.user!.role,
        overrideReason: notes || (isOverride ? 'Administrative intervention' : undefined),
        timestamp: new Date().toISOString(),
      },
    });

    res.json({
      ...updated[0],
      isOverride,
    });
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ==========================================
// 7. SUPPLIER DIRECTORY & PROFILES (SANITIZED)
// ==========================================

apiRouter.get('/suppliers', async (req: Request, res: Response) => {
  try {
    const region = req.query.region as string | undefined;

    // Only expose verified suppliers on the public directory
    const list = await db.select({
      profile: supplierProfiles,
      org: organizations,
    })
    .from(supplierProfiles)
    .innerJoin(organizations, eq(supplierProfiles.organizationId, organizations.id))
    .where(eq(supplierProfiles.verificationStatus, 'verified'));

    let filtered = list;
    if (region && region !== 'all') {
      filtered = filtered.filter(s => s.profile.serviceRegions.includes(region) || s.org.region === region);
    }

    // Publicly sanitized supplier fields
    res.json(filtered.map(s => ({
      id: s.profile.id,
      organizationId: s.profile.organizationId,
      verificationStatus: s.profile.verificationStatus,
      businessDescription: s.profile.businessDescription,
      serviceRegions: s.profile.serviceRegions,
      rating: s.profile.rating,
      totalQuotes: s.profile.totalQuotes,
      successfulOrders: s.profile.successfulOrders,
      yearsInBusiness: s.profile.yearsInBusiness,
      organization: {
        id: s.org.id,
        name: s.org.name,
        city: s.org.city,
        region: s.org.region,
      },
    })));
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// ==========================================
// 8. ADMIN DASHBOARD & AUDIT LOGS (ADMIN ROLE PROTECTED)
// ==========================================

apiRouter.get('/admin/overview', requireAuth, requireAdmin, adminLimiter, async (_req: AuthRequest, res: Response) => {
  try {
    const totalUsers = (await db.select({ count: sql<number>`count(*)::int` }).from(users))[0]?.count || 0;
    const totalOrgs = (await db.select({ count: sql<number>`count(*)::int` }).from(organizations))[0]?.count || 0;
    const totalRfqs = (await db.select({ count: sql<number>`count(*)::int` }).from(materialRequests))[0]?.count || 0;
    const totalQuotes = (await db.select({ count: sql<number>`count(*)::int` }).from(quotations))[0]?.count || 0;
    const totalOrders = (await db.select({ count: sql<number>`count(*)::int` }).from(orders))[0]?.count || 0;
    const pendingSuppliers = (await db.select({ count: sql<number>`count(*)::int` }).from(supplierProfiles).where(eq(supplierProfiles.verificationStatus, 'pending')))[0]?.count || 0;

    res.json({
      metrics: {
        totalUsers,
        totalOrganizations: totalOrgs,
        totalRfqs,
        totalQuotations: totalQuotes,
        totalOrders,
        pendingSupplierVerifications: pendingSuppliers,
      },
    });
  } catch (error: any) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to fetch admin overview' });
  }
});

apiRouter.get('/admin/suppliers/pending', requireAuth, requireAdmin, adminLimiter, async (_req: AuthRequest, res: Response) => {
  try {
    const pending = await db.select({
      profile: supplierProfiles,
      org: organizations,
    })
    .from(supplierProfiles)
    .innerJoin(organizations, eq(supplierProfiles.organizationId, organizations.id))
    .where(or(
      eq(supplierProfiles.verificationStatus, 'pending'),
      eq(supplierProfiles.verificationStatus, 'under_review')
    ))
    .orderBy(desc(supplierProfiles.createdAt));

    res.json(pending);
  } catch (error: any) {
    console.error('Error fetching pending suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch pending suppliers' });
  }
});

apiRouter.post('/admin/suppliers/:id/verify', requireAuth, requireAdmin, adminLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = req.params.id;
    const { status, notes } = req.body;

    if (!status || !['verified', 'rejected', 'under_review', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }

    const updated = await db.transaction(async (tx) => {
      const supp = await tx.update(supplierProfiles)
        .set({ verificationStatus: status, updatedAt: new Date() })
        .where(eq(supplierProfiles.id, profileId))
        .returning();

      if (supp.length) {
        await tx.update(organizations)
          .set({ verificationStatus: status, verificationNotes: notes || null, updatedAt: new Date() })
          .where(eq(organizations.id, supp[0].organizationId));
      }

      return supp[0];
    });

    await logAuditEvent({
      actorUserId: req.user!.uid,
      action: 'SUPPLIER_VERIFICATION_UPDATED',
      resourceType: 'supplier_profile',
      resourceId: profileId,
      metadata: { newStatus: status, notes },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error verifying supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier verification' });
  }
});

apiRouter.get('/admin/audit-logs', requireAuth, requireAdmin, adminLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '50', 10)));
    const logs = await db.select({
      log: auditLogs,
      actor: users,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

    res.json(logs.map(l => ({
      ...l.log,
      actorName: l.actor?.name,
      actorEmail: l.actor?.email,
    })));
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Admin Users Management
apiRouter.get('/admin/users', requireAuth, requireAdmin, adminLimiter, async (_req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatar: users.avatar,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      orgId: organizations.id,
      orgName: organizations.name,
      orgType: organizations.type,
      orgVerification: organizations.verificationStatus,
    })
    .from(users)
    .leftJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .leftJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .orderBy(desc(users.createdAt));

    res.json(allUsers);
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

apiRouter.patch('/admin/users/:id/role', requireAuth, requireAdmin, adminLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;
    const validRoles = ['contractor', 'supplier', 'admin', 'super_admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const targetUser = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((role === 'super_admin' || targetUser[0].role === 'super_admin') && req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Super Administrator privileges required to manage super_admin roles' });
    }

    const updated = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, targetUserId))
      .returning();

    await logAuditEvent({
      actorUserId: req.user!.uid,
      action: 'USER_ROLE_CHANGED',
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { previousRole: targetUser[0].role, newRole: role },
    });

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Admin Organizations Management
apiRouter.get('/admin/organizations', requireAuth, requireAdmin, adminLimiter, async (_req: AuthRequest, res: Response) => {
  try {
    const orgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));
    res.json(orgs);
  } catch (error: any) {
    console.error('Error fetching admin organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

apiRouter.patch('/admin/organizations/:id/status', requireAuth, requireAdmin, adminLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.params.id;
    const { status, notes } = req.body;
    if (!status || !['verified', 'pending', 'under_review', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid organization status' });
    }

    const updated = await db.update(organizations)
      .set({ verificationStatus: status, verificationNotes: notes || null, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    await db.update(supplierProfiles)
      .set({ verificationStatus: status, updatedAt: new Date() })
      .where(eq(supplierProfiles.organizationId, orgId));

    await logAuditEvent({
      actorUserId: req.user!.uid,
      organizationId: orgId,
      action: 'ORGANIZATION_STATUS_UPDATED',
      resourceType: 'organization',
      resourceId: orgId,
      metadata: { newStatus: status, notes },
    });

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Error updating organization status:', error);
    res.status(500).json({ error: 'Failed to update organization status' });
  }
});

// Admin Global RFQ Management
apiRouter.get('/admin/rfqs', requireAuth, requireAdmin, adminLimiter, async (_req: AuthRequest, res: Response) => {
  try {
    const allRfqs = await db.select({
      rfq: materialRequests,
      project: projects,
      org: organizations,
    })
    .from(materialRequests)
    .innerJoin(projects, eq(materialRequests.projectId, projects.id))
    .innerJoin(organizations, eq(materialRequests.organizationId, organizations.id))
    .orderBy(desc(materialRequests.createdAt));

    const rfqIds = allRfqs.map(r => r.rfq.id);
    const itemCounts = rfqIds.length > 0 ? await db.select({
      requestId: materialRequestItems.materialRequestId,
      count: sql<number>`count(*)::int`,
    }).from(materialRequestItems).where(inArray(materialRequestItems.materialRequestId, rfqIds)).groupBy(materialRequestItems.materialRequestId) : [];

    const quoteCounts = rfqIds.length > 0 ? await db.select({
      requestId: quotations.materialRequestId,
      count: sql<number>`count(*)::int`,
    }).from(quotations).where(inArray(quotations.materialRequestId, rfqIds)).groupBy(quotations.materialRequestId) : [];

    const itemsMap = new Map(itemCounts.map(i => [i.requestId, i.count]));
    const quotesMap = new Map(quoteCounts.map(q => [q.requestId, q.count]));

    res.json(allRfqs.map(r => ({
      ...r.rfq,
      projectName: r.project.name,
      organizationName: r.org.name,
      itemsCount: itemsMap.get(r.rfq.id) || 0,
      quotesCount: quotesMap.get(r.rfq.id) || 0,
    })));
  } catch (error: any) {
    console.error('Error fetching admin RFQs:', error);
    res.status(500).json({ error: 'Failed to fetch RFQs' });
  }
});

apiRouter.patch('/admin/rfqs/:id/status', requireAuth, requireAdmin, adminLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const rfqId = req.params.id;
    const { status, reason } = req.body;
    if (!status || !['draft', 'published', 'closed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid RFQ status' });
    }

    const updated = await db.update(materialRequests)
      .set({ status, notes: reason ? `[Admin Action]: ${reason}` : undefined, updatedAt: new Date() })
      .where(eq(materialRequests.id, rfqId))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    await logAuditEvent({
      actorUserId: req.user!.uid,
      action: 'RFQ_STATUS_ADMIN_UPDATED',
      resourceType: 'material_request',
      resourceId: rfqId,
      metadata: { newStatus: status, reason },
    });

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Error updating RFQ status:', error);
    res.status(500).json({ error: 'Failed to update RFQ status' });
  }
});

// Admin Global Orders Management & Direct Overrides
apiRouter.get('/admin/orders', requireAuth, requireAdmin, adminLimiter, async (_req: AuthRequest, res: Response) => {
  try {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    
    const orgIds = Array.from(new Set([
      ...allOrders.map(o => o.buyerOrganizationId),
      ...allOrders.map(o => o.supplierOrganizationId)
    ]));

    const orgsList = orgIds.length > 0 ? await db.select().from(organizations).where(inArray(organizations.id, orgIds)) : [];
    const orgMap = new Map(orgsList.map(o => [o.id, o]));

    res.json(allOrders.map(o => ({
      ...o,
      buyerOrg: orgMap.get(o.buyerOrganizationId),
      supplierOrg: orgMap.get(o.supplierOrganizationId),
    })));
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ error: 'Failed to fetch admin orders' });
  }
});

apiRouter.post('/admin/orders/:id/override', requireAuth, requireAdmin, adminLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const { status, reason } = req.body;
    if (!status || !['placed', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }
    if (!reason || String(reason).trim().length < 5) {
      return res.status(400).json({ error: 'A clear administrative justification (at least 5 characters) is required for state machine overrides.' });
    }

    const existing = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = existing[0];
    const updated = await db.update(orders).set({
      status,
      notes: `[Admin Override]: ${String(reason).trim()}`,
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId)).returning();

    await logAuditEvent({
      actorUserId: req.user!.uid,
      organizationId: order.buyerOrganizationId,
      action: 'ORDER_STATUS_OVERRIDE',
      resourceType: 'order',
      resourceId: orderId,
      metadata: {
        previousStatus: order.status,
        newStatus: status,
        isOverride: true,
        actorRole: req.user!.role,
        overrideReason: String(reason).trim(),
        timestamp: new Date().toISOString(),
      },
    });

    res.json({ ...updated[0], isOverride: true });
  } catch (error: any) {
    console.error('Error in administrative order override:', error);
    res.status(500).json({ error: 'Failed to execute administrative order override' });
  }
});

// Admin Material Catalog
apiRouter.get('/admin/catalog', requireAuth, requireAdmin, adminLimiter, async (_req: AuthRequest, res: Response) => {
  try {
    const cats = await db.select().from(materialCategories).orderBy(materialCategories.name);
    const mats = await db.select().from(materials).orderBy(materials.name);
    res.json({ categories: cats, materials: mats });
  } catch (error: any) {
    console.error('Error fetching catalog:', error);
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

apiRouter.post('/admin/catalog/material', requireAuth, requireAdmin, adminLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { id, categoryId, name, specification, unit, description } = req.body;
    if (!categoryId || !name || !unit) {
      return res.status(400).json({ error: 'Missing required material fields (categoryId, name, unit)' });
    }

    if (id) {
      const updated = await db.update(materials).set({
        categoryId,
        name,
        standardSpec: specification || null,
        unit,
        description: description || null,
        updatedAt: new Date(),
      }).where(eq(materials.id, id)).returning();
      return res.json(updated[0]);
    } else {
      const newId = `mat_${crypto.randomUUID()}`;
      const created = await db.insert(materials).values({
        id: newId,
        categoryId,
        name,
        standardSpec: specification || null,
        unit,
        description: description || null,
        active: true,
      }).returning();
      return res.json(created[0]);
    }
  } catch (error: any) {
    console.error('Error saving catalog material:', error);
    res.status(500).json({ error: 'Failed to save catalog material' });
  }
});

// Admin System Diagnostics & Sequence Management
apiRouter.get('/admin/system/diagnostics', requireAuth, requireAdmin, adminLimiter, async (_req: AuthRequest, res: Response) => {
  try {
    const rfqSeq = await db.execute(sql`SELECT last_value, is_called FROM rfq_number_seq;`);
    const quoteSeq = await db.execute(sql`SELECT last_value, is_called FROM quote_number_seq;`);
    const orderSeq = await db.execute(sql`SELECT last_value, is_called FROM order_number_seq;`);

    const usersCount = (await db.select({ count: sql<number>`count(*)::int` }).from(users))[0]?.count || 0;
    const orgsCount = (await db.select({ count: sql<number>`count(*)::int` }).from(organizations))[0]?.count || 0;
    const rfqsCount = (await db.select({ count: sql<number>`count(*)::int` }).from(materialRequests))[0]?.count || 0;
    const quotesCount = (await db.select({ count: sql<number>`count(*)::int` }).from(quotations))[0]?.count || 0;
    const ordersCount = (await db.select({ count: sql<number>`count(*)::int` }).from(orders))[0]?.count || 0;
    const auditCount = (await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs))[0]?.count || 0;

    res.json({
      status: 'healthy',
      environment: process.env.NODE_ENV || 'production',
      database: {
        engine: 'Cloud SQL PostgreSQL',
        connected: true,
        sequences: {
          rfq_number_seq: rfqSeq.rows[0],
          quote_number_seq: quoteSeq.rows[0],
          order_number_seq: orderSeq.rows[0],
        },
        counts: {
          users: usersCount,
          organizations: orgsCount,
          rfqs: rfqsCount,
          quotations: quotesCount,
          orders: ordersCount,
          auditLogs: auditCount,
        },
      },
      security: {
        devTokenBlockedInProduction: true,
        firebaseAdminAuth: true,
        strictOrderStateMachine: true,
        csvFormulaInjectionSanitized: true,
        databaseRoleAuthority: true,
      },
    });
  } catch (error: any) {
    console.error('Error fetching system diagnostics:', error);
    res.status(500).json({ error: 'Failed to fetch diagnostics' });
  }
});

apiRouter.post('/admin/system/align-sequences', requireAuth, requireSuperAdmin, adminLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const result = await runMigrations();
    await logAuditEvent({
      actorUserId: req.user!.uid,
      action: 'SYSTEM_SEQUENCES_ALIGNED',
      resourceType: 'system',
      resourceId: 'sequences',
      metadata: result.sequencesAligned,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error aligning sequences:', error);
    res.status(500).json({ error: 'Failed to align sequences' });
  }
});

// Notifications (Strictly scoped to verified authenticated user)
apiRouter.get('/notifications', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userNotes = await db.select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.uid))
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    res.json(userNotes);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read (Strictly user-authorized)
apiRouter.patch('/notifications/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const note = await db.select().from(notifications).where(eq(notifications.id, noteId)).limit(1);
    if (!note.length) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Must be the owner of the notification or super_admin
    if (note[0].userId !== req.user!.uid && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot modify another user\'s notification' });
    }

    const updated = await db.update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, noteId))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});
