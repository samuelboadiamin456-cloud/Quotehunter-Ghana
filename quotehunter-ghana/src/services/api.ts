import {
  User,
  Organization,
  Project,
  MaterialCategory,
  Material,
  MaterialRequest,
  Quotation,
  Order,
  SupplierProfile,
  ComparisonMatrixData,
  AuditLogItem,
} from '../types/index.ts';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('qh_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = 'Request failed';
    try {
      const data = await res.json();
      errMsg = data.error || errMsg;
    } catch {
      errMsg = `${res.status} ${res.statusText}`;
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async getMe(): Promise<{ user: User; organizations: Organization[]; supplierProfile: SupplierProfile | null }> {
    const res = await fetch('/api/auth/me', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  /**
   * Development-only helper. Strictly disabled and blocked in production builds.
   * Production authentication exclusively uses Firebase Authentication (signInWithPopup / Google Auth).
   */
  async authenticateSession(payload: {
    email: string;
    name?: string;
    role?: string;
    organizationName?: string;
    region?: string;
  }): Promise<{ token: string; user: User }> {
    if (!import.meta.env.DEV) {
      throw new Error('authenticateSession is a development helper and is strictly disabled in production builds');
    }
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async markNotificationAsRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createOrganization(payload: {
    name: string;
    type: 'contractor' | 'supplier';
    phone: string;
    email: string;
    address: string;
    city: string;
    region: string;
    registrationNumber?: string;
    tinNumber?: string;
    businessDescription?: string;
    serviceRegions?: string[];
  }): Promise<Organization> {
    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Materials & Categories
  async getCategories(): Promise<MaterialCategory[]> {
    const res = await fetch('/api/materials/categories');
    return handleResponse(res);
  },

  async getMaterials(categoryId?: string, search?: string): Promise<Material[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (search) params.append('search', search);
    const res = await fetch(`/api/materials?${params.toString()}`);
    return handleResponse(res);
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch('/api/projects', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createProject(payload: {
    name: string;
    description?: string;
    location: string;
    region: string;
    startDate?: string;
    expectedCompletionDate?: string;
    estimatedBudget?: number;
  }): Promise<Project> {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // RFQs
  async getRfqs(): Promise<MaterialRequest[]> {
    const res = await fetch('/api/rfqs', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getRfq(id: string): Promise<MaterialRequest> {
    const res = await fetch(`/api/rfqs/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createRfq(payload: {
    projectId: string;
    title: string;
    deliveryLocation: string;
    deliveryRegion: string;
    deadline: string;
    requiredDeliveryDate?: string;
    notes?: string;
    items: Array<{
      itemName: string;
      quantity: number;
      unit: string;
      specification?: string;
      materialId?: string | null;
      notes?: string;
    }>;
  }): Promise<MaterialRequest> {
    const res = await fetch('/api/rfqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async parseBoqCsv(csvContent: string): Promise<{
    success: boolean;
    totalRows: number;
    parsedCount: number;
    items: Array<{
      itemName: string;
      quantity: number;
      unit: string;
      specification: string;
      materialId: string | null;
      confidence: 'matched' | 'unmatched';
    }>;
  }> {
    const res = await fetch('/api/rfqs/parse-boq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ csvContent }),
    });
    return handleResponse(res);
  },

  // Quotations & Comparison
  async submitQuotation(rfqId: string, payload: {
    deliveryCostGhs: number;
    validityDate: string;
    leadTimeDays: number;
    paymentTerms?: string;
    notes?: string;
    items: Array<{
      materialRequestItemId: string;
      unitPriceGhs: number;
      isAvailable?: boolean;
      leadTime?: string;
      notes?: string;
    }>;
  }): Promise<Quotation> {
    const res = await fetch(`/api/rfqs/${rfqId}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getComparisonMatrix(rfqId: string): Promise<ComparisonMatrixData> {
    const res = await fetch(`/api/rfqs/${rfqId}/comparison-matrix`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async acceptQuotation(quoteId: string, payload: {
    deliveryAddress?: string;
    deliveryRegion?: string;
    contactName?: string;
    contactPhone?: string;
    scheduledDate?: string;
    notes?: string;
  }): Promise<{ success: boolean; order: Order }> {
    const res = await fetch(`/api/quotations/${quoteId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    const res = await fetch('/api/orders', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, notes }),
    });
    return handleResponse(res);
  },

  // Suppliers
  async getSuppliers(region?: string): Promise<SupplierProfile[]> {
    const params = new URLSearchParams();
    if (region) params.append('region', region);
    const res = await fetch(`/api/suppliers?${params.toString()}`);
    return handleResponse(res);
  },

  // Admin
  async getAdminOverview(): Promise<{
    metrics: {
      totalUsers: number;
      totalOrganizations: number;
      totalRfqs: number;
      totalQuotations: number;
      totalOrders: number;
      pendingSupplierVerifications: number;
    };
  }> {
    const res = await fetch('/api/admin/overview', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getPendingSuppliers(): Promise<Array<{ profile: SupplierProfile; org: Organization }>> {
    const res = await fetch('/api/admin/suppliers/pending', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async verifySupplier(profileId: string, status: string, notes?: string): Promise<SupplierProfile> {
    const res = await fetch(`/api/admin/suppliers/${profileId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, notes }),
    });
    return handleResponse(res);
  },

  async getAuditLogs(limit = 50): Promise<AuditLogItem[]> {
    const res = await fetch(`/api/admin/audit-logs?limit=${limit}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getAdminUsers(): Promise<any[]> {
    const res = await fetch('/api/admin/users', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateUserRole(userId: string, role: string): Promise<any> {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ role }),
    });
    return handleResponse(res);
  },

  async getAdminOrganizations(): Promise<any[]> {
    const res = await fetch('/api/admin/organizations', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateOrganizationStatus(orgId: string, status: string, notes?: string): Promise<any> {
    const res = await fetch(`/api/admin/organizations/${orgId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, notes }),
    });
    return handleResponse(res);
  },

  async getAdminRfqs(): Promise<any[]> {
    const res = await fetch('/api/admin/rfqs', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateAdminRfqStatus(rfqId: string, status: string, reason?: string): Promise<any> {
    const res = await fetch(`/api/admin/rfqs/${rfqId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, reason }),
    });
    return handleResponse(res);
  },

  async getAdminOrders(): Promise<any[]> {
    const res = await fetch('/api/admin/orders', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async adminOverrideOrderStatus(orderId: string, status: string, reason: string): Promise<any> {
    const res = await fetch(`/api/admin/orders/${orderId}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, reason }),
    });
    return handleResponse(res);
  },

  async getAdminCatalog(): Promise<{ categories: any[]; materials: any[] }> {
    const res = await fetch('/api/admin/catalog', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async saveAdminCatalogMaterial(payload: {
    id?: string;
    categoryId: string;
    name: string;
    standardizedName?: string;
    specification?: string;
    unit: string;
    standardPriceGhs?: number | string;
    description?: string;
  }): Promise<any> {
    const res = await fetch('/api/admin/catalog/material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getAdminDiagnostics(): Promise<any> {
    const res = await fetch('/api/admin/system/diagnostics', {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async alignAdminSequences(): Promise<any> {
    const res = await fetch('/api/admin/system/align-sequences', {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },
};

