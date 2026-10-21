import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, text, timestamp, pgSequence } from 'drizzle-orm/pg-core';

// Concurrency-safe atomic database sequences for procurement number generation
export const rfqNumberSeq = pgSequence('rfq_number_seq');
export const quoteNumberSeq = pgSequence('quote_number_seq');
export const orderNumberSeq = pgSequence('order_number_seq');

// Users table (maps to Firebase Auth UID)
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  avatar: text('avatar'),
  role: text('role').notNull().default('contractor'), // 'contractor', 'supplier', 'admin', 'super_admin'
  status: text('status').notNull().default('active'), // 'active', 'suspended', 'pending'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
});

// Organizations (Contractor firms, Supplier businesses, Admin org)
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'contractor', 'supplier', 'admin'
  registrationNumber: text('registration_number'),
  tinNumber: text('tin_number'),
  phone: text('phone'),
  email: text('email').notNull(),
  address: text('address'),
  city: text('city'),
  region: text('region'), // Greater Accra, Ashanti, Western, etc.
  country: text('country').notNull().default('Ghana'),
  verificationStatus: text('verification_status').notNull().default('pending'), // 'pending', 'under_review', 'verified', 'rejected', 'suspended'
  verificationNotes: text('verification_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Organization members with granular RBAC
export const organizationMembers = pgTable('organization_members', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(), // 'owner', 'project_manager', 'procurement_officer', 'quantity_surveyor', 'admin', 'sales_rep'
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Projects managed by contractors
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location').notNull(),
  region: text('region').notNull(),
  status: text('status').notNull().default('active'), // 'planning', 'active', 'on_hold', 'completed', 'archived'
  startDate: text('start_date'),
  expectedCompletionDate: text('expected_completion_date'),
  budgetCurrency: text('budget_currency').notNull().default('GHS'),
  estimatedBudget: integer('estimated_budget'), // stored in minor pesewas or whole GHS
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Standard Material Categories in Ghanaian construction
export const materialCategories = pgTable('material_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  code: text('code'),
});

// Standard Materials
export const materials = pgTable('materials', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .references(() => materialCategories.id)
    .notNull(),
  name: text('name').notNull(),
  unit: text('unit').notNull(), // e.g. 'Bag (50kg)', 'Trip (15m³)', 'Trip (20m³)', 'Tonne', 'Length (12m)', 'Bundle', 'Square Metre', 'Piece'
  description: text('description'),
  standardSpec: text('standard_spec'), // e.g. Grade 42.5R Portland Cement, BS4449 Grade 500B High Tensile Rebar
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Supplier Business Profiles
export const supplierProfiles = pgTable('supplier_profiles', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  verificationStatus: text('verification_status').notNull().default('pending'), // 'pending', 'under_review', 'verified', 'rejected', 'suspended'
  businessDescription: text('business_description'),
  serviceRegions: text('service_regions').notNull(), // JSON string or comma-separated list of Ghana regions
  warehouseAddress: text('warehouse_address'),
  rating: text('rating').default('0.00').notNull(),
  totalQuotes: integer('total_quotes').default(0).notNull(),
  successfulOrders: integer('successful_orders').default(0).notNull(),
  yearsInBusiness: integer('years_in_business').default(1).notNull(),
  deliveryFleetInfo: text('delivery_fleet_info'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Materials offered by suppliers with pricing & lead times
export const supplierMaterials = pgTable('supplier_materials', {
  id: text('id').primaryKey(),
  supplierProfileId: text('supplier_profile_id')
    .references(() => supplierProfiles.id, { onDelete: 'cascade' })
    .notNull(),
  materialId: text('material_id')
    .references(() => materials.id)
    .notNull(),
  unitPriceGhs: integer('unit_price_ghs').notNull(), // price in GHS (e.g. 110 for cement bag)
  unit: text('unit').notNull(),
  minimumOrderQty: integer('minimum_order_qty').default(1).notNull(),
  inStock: boolean('in_stock').default(true).notNull(),
  leadTimeDays: integer('lead_time_days').default(1).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Material Requests (RFQs)
export const materialRequests = pgTable('material_requests', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  createdByUserId: text('created_by_user_id')
    .references(() => users.id)
    .notNull(),
  requestNumber: text('request_number').notNull().unique(), // e.g. RFQ-2026-001
  title: text('title').notNull(),
  deliveryLocation: text('delivery_location').notNull(),
  deliveryRegion: text('delivery_region').notNull(),
  deadline: text('deadline').notNull(),
  requiredDeliveryDate: text('required_delivery_date'),
  notes: text('notes'),
  status: text('status').notNull().default('open'), // 'draft', 'open', 'reviewing', 'awarded', 'closed', 'cancelled'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Items in an RFQ
export const materialRequestItems = pgTable('material_request_items', {
  id: text('id').primaryKey(),
  materialRequestId: text('material_request_id')
    .references(() => materialRequests.id, { onDelete: 'cascade' })
    .notNull(),
  materialId: text('material_id')
    .references(() => materials.id),
  itemName: text('item_name').notNull(),
  quantity: integer('quantity').notNull(),
  unit: text('unit').notNull(),
  specification: text('specification'),
  notes: text('notes'),
});

// Quotations submitted by suppliers for RFQs
export const quotations = pgTable('quotations', {
  id: text('id').primaryKey(),
  materialRequestId: text('material_request_id')
    .references(() => materialRequests.id, { onDelete: 'restrict' })
    .notNull(),
  supplierProfileId: text('supplier_profile_id')
    .references(() => supplierProfiles.id, { onDelete: 'restrict' })
    .notNull(),
  supplierOrganizationId: text('supplier_organization_id')
    .references(() => organizations.id)
    .notNull(),
  quoteNumber: text('quote_number').notNull().unique(), // e.g. QUO-2026-001
  status: text('status').notNull().default('submitted'), // 'submitted', 'accepted', 'rejected', 'expired'
  subtotalGhs: integer('subtotal_ghs').notNull(),
  deliveryCostGhs: integer('delivery_cost_ghs').notNull(),
  taxAmountGhs: integer('tax_amount_ghs').default(0).notNull(),
  totalGhs: integer('total_ghs').notNull(),
  currency: text('currency').notNull().default('GHS'),
  validityDate: text('validity_date').notNull(),
  leadTimeDays: integer('lead_time_days').default(2).notNull(),
  paymentTerms: text('payment_terms'),
  notes: text('notes'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Line items in a supplier quotation
export const quotationItems = pgTable('quotation_items', {
  id: text('id').primaryKey(),
  quotationId: text('quotation_id')
    .references(() => quotations.id, { onDelete: 'cascade' })
    .notNull(),
  materialRequestItemId: text('material_request_item_id')
    .references(() => materialRequestItems.id, { onDelete: 'cascade' })
    .notNull(),
  unitPriceGhs: integer('unit_price_ghs').notNull(),
  quantity: integer('quantity').notNull(),
  subtotalGhs: integer('subtotal_ghs').notNull(), // unitPrice * quantity
  isAvailable: boolean('is_available').default(true).notNull(),
  leadTime: text('lead_time'),
  notes: text('notes'),
});

// Orders created upon quote acceptance
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(), // e.g. ORD-2026-001
  quotationId: text('quotation_id')
    .references(() => quotations.id)
    .notNull(),
  materialRequestId: text('material_request_id')
    .references(() => materialRequests.id)
    .notNull(),
  buyerOrganizationId: text('buyer_organization_id')
    .references(() => organizations.id)
    .notNull(),
  supplierOrganizationId: text('supplier_organization_id')
    .references(() => organizations.id)
    .notNull(),
  status: text('status').notNull().default('placed'), // 'placed', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled'
  totalAmountGhs: integer('total_amount_ghs').notNull(),
  currency: text('currency').notNull().default('GHS'),
  deliveryAddress: text('delivery_address').notNull(),
  deliveryRegion: text('delivery_region').notNull(),
  deliveryContactName: text('delivery_contact_name').notNull(),
  deliveryContactPhone: text('delivery_contact_phone').notNull(),
  scheduledDeliveryDate: text('scheduled_delivery_date'),
  actualDeliveryDate: text('actual_delivery_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Order Reviews
export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .references(() => orders.id)
    .notNull().unique(),
  reviewerOrganizationId: text('reviewer_organization_id')
    .references(() => organizations.id)
    .notNull(),
  reviewedOrganizationId: text('reviewed_organization_id')
    .references(() => organizations.id)
    .notNull(),
  rating: integer('rating').notNull(), // 1 to 5
  deliveryPunctualityRating: integer('delivery_punctuality_rating'),
  materialQualityRating: integer('material_quality_rating'),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Notifications
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'rfq_created', 'quote_received', 'quote_accepted', 'order_status', 'supplier_verified'
  title: text('title').notNull(),
  body: text('body').notNull(),
  link: text('link'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audit Logs for compliance and security
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id')
    .references(() => users.id),
  organizationId: text('organization_id'),
  action: text('action').notNull(), // 'LOGIN', 'CREATE_PROJECT', 'CREATE_RFQ', 'SUBMIT_QUOTE', 'ACCEPT_QUOTE', 'VERIFY_SUPPLIER', etc.
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  metadata: text('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Drizzle Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  notifications: many(notifications),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  members: many(organizationMembers),
  projects: many(projects),
  supplierProfile: one(supplierProfiles, {
    fields: [organizations.id],
    references: [supplierProfiles.organizationId],
  }),
  materialRequests: many(materialRequests),
  ordersAsBuyer: many(orders, { relationName: 'buyerOrders' }),
  ordersAsSupplier: many(orders, { relationName: 'supplierOrders' }),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  materialRequests: many(materialRequests),
}));

export const materialRequestsRelations = relations(materialRequests, ({ one, many }) => ({
  project: one(projects, {
    fields: [materialRequests.projectId],
    references: [projects.id],
  }),
  organization: one(organizations, {
    fields: [materialRequests.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [materialRequests.createdByUserId],
    references: [users.id],
  }),
  items: many(materialRequestItems),
  quotations: many(quotations),
}));

export const materialRequestItemsRelations = relations(materialRequestItems, ({ one, many }) => ({
  materialRequest: one(materialRequests, {
    fields: [materialRequestItems.materialRequestId],
    references: [materialRequests.id],
  }),
  material: one(materials, {
    fields: [materialRequestItems.materialId],
    references: [materials.id],
  }),
  quotationItems: many(quotationItems),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  materialRequest: one(materialRequests, {
    fields: [quotations.materialRequestId],
    references: [materialRequests.id],
  }),
  supplierProfile: one(supplierProfiles, {
    fields: [quotations.supplierProfileId],
    references: [supplierProfiles.id],
  }),
  supplierOrganization: one(organizations, {
    fields: [quotations.supplierOrganizationId],
    references: [organizations.id],
  }),
  items: many(quotationItems),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
  materialRequestItem: one(materialRequestItems, {
    fields: [quotationItems.materialRequestItemId],
    references: [materialRequestItems.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  quotation: one(quotations, {
    fields: [orders.quotationId],
    references: [quotations.id],
  }),
  materialRequest: one(materialRequests, {
    fields: [orders.materialRequestId],
    references: [materialRequests.id],
  }),
  buyerOrganization: one(organizations, {
    fields: [orders.buyerOrganizationId],
    references: [organizations.id],
    relationName: 'buyerOrders',
  }),
  supplierOrganization: one(organizations, {
    fields: [orders.supplierOrganizationId],
    references: [organizations.id],
    relationName: 'supplierOrders',
  }),
  review: one(reviews, {
    fields: [orders.id],
    references: [reviews.orderId],
  }),
}));
