export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatar?: string | null;
  role: 'contractor' | 'supplier' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'pending';
  lastLoginAt?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  type: 'contractor' | 'supplier' | 'admin';
  registrationNumber?: string | null;
  tinNumber?: string | null;
  phone: string;
  email: string;
  address: string;
  city: string;
  region: string;
  country: string;
  verificationStatus: 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
  verificationNotes?: string | null;
  memberRole?: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  location: string;
  region: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  startDate?: string | null;
  expectedCompletionDate?: string | null;
  budgetCurrency: string;
  estimatedBudget?: number | null;
  createdAt: string;
}

export interface MaterialCategory {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
}

export interface Material {
  id: string;
  categoryId: string;
  name: string;
  unit: string;
  description?: string | null;
  standardSpec?: string | null;
  categoryName?: string;
}

export interface MaterialRequestItem {
  id: string;
  materialRequestId: string;
  materialId?: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  specification?: string | null;
  notes?: string | null;
}

export interface MaterialRequest {
  id: string;
  projectId: string;
  organizationId: string;
  createdByUserId: string;
  requestNumber: string;
  title: string;
  deliveryLocation: string;
  deliveryRegion: string;
  deadline: string;
  requiredDeliveryDate?: string | null;
  notes?: string | null;
  status: 'draft' | 'open' | 'reviewing' | 'awarded' | 'closed' | 'cancelled';
  createdAt: string;
  project?: {
    name: string;
    location: string;
    region: string;
  };
  organization?: {
    name: string;
  };
  items?: MaterialRequestItem[];
  quotesReceivedCount?: number;
  quotations?: Quotation[];
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  materialRequestItemId: string;
  unitPriceGhs: number;
  quantity: number;
  subtotalGhs: number;
  isAvailable: boolean;
  leadTime?: string | null;
  notes?: string | null;
}

export interface Quotation {
  id: string;
  materialRequestId: string;
  supplierProfileId: string;
  supplierOrganizationId: string;
  quoteNumber: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'expired';
  subtotalGhs: number;
  deliveryCostGhs: number;
  taxAmountGhs: number;
  totalGhs: number;
  currency: string;
  validityDate: string;
  leadTimeDays: number;
  paymentTerms?: string | null;
  notes?: string | null;
  submittedAt: string;
  supplier?: {
    id: string;
    name: string;
    phone: string;
    city: string;
    region: string;
    verificationStatus: string;
    rating: string;
    successfulOrders: number;
    yearsInBusiness: number;
  };
  items?: QuotationItem[];
}

export interface Order {
  id: string;
  orderNumber: string;
  quotationId: string;
  materialRequestId: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  status: 'placed' | 'confirmed' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
  totalAmountGhs: number;
  currency: string;
  deliveryAddress: string;
  deliveryRegion: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  scheduledDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  notes?: string | null;
  createdAt: string;
  buyer?: {
    name: string;
  };
}

export interface SupplierProfile {
  id: string;
  organizationId: string;
  verificationStatus: 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
  businessDescription?: string | null;
  serviceRegions: string; // JSON array or string
  warehouseAddress?: string | null;
  rating: string;
  totalQuotes: number;
  successfulOrders: number;
  yearsInBusiness: number;
  deliveryFleetInfo?: string | null;
  organization?: Organization;
}

export interface ComparisonMatrixRow {
  item: MaterialRequestItem;
  supplierOffers: Record<string, {
    unitPriceGhs: number | null;
    subtotalGhs: number | null;
    isAvailable: boolean;
    notes: string;
  }>;
}

export interface ComparisonMatrixData {
  rfq: MaterialRequest;
  items: MaterialRequestItem[];
  suppliers: Array<{
    quoteId: string;
    quoteNumber: string;
    status: string;
    subtotalGhs: number;
    deliveryCostGhs: number;
    totalGhs: number;
    leadTimeDays: number;
    validityDate: string;
    paymentTerms?: string;
    supplierId: string;
    supplierName: string;
    verificationStatus: string;
    rating: string;
    totalOrders: number;
  }>;
  matrix: ComparisonMatrixRow[];
}

export interface AuditLogItem {
  id: string;
  actorUserId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  organizationId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}
