import { z } from 'zod';
import { GHANA_REGIONS } from '../constants/ghana.ts';

const validRegionNames = GHANA_REGIONS.map(r => r.name);

// Organization validation
export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
  type: z.enum(['contractor', 'supplier']),
  phone: z.string().trim().min(7, 'Valid phone number is required').max(30),
  email: z.string().trim().email('Valid email is required').max(100),
  address: z.string().trim().min(3, 'Address is required').max(200),
  city: z.string().trim().min(2, 'City is required').max(100),
  region: z.string().refine(val => validRegionNames.includes(val) || val.length > 0, {
    message: 'Valid Ghana region is required',
  }),
  registrationNumber: z.string().trim().max(50).optional().nullable(),
  tinNumber: z.string().trim().max(50).optional().nullable(),
  businessDescription: z.string().trim().max(1000).optional().nullable(),
  serviceRegions: z.array(z.string()).optional().nullable(),
});

// Project validation
export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name is required').max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  location: z.string().trim().min(2, 'Site location is required').max(150),
  region: z.string().refine(val => validRegionNames.includes(val) || val.length > 0, {
    message: 'Valid Ghana region is required',
  }),
  startDate: z.string().trim().max(50).optional().nullable(),
  expectedCompletionDate: z.string().trim().max(50).optional().nullable(),
  estimatedBudget: z.union([z.number(), z.string()]).optional().nullable(),
});

// RFQ Line Item validation
export const rfqItemSchema = z.object({
  materialId: z.string().trim().max(50).optional().nullable(),
  itemName: z.string().trim().min(1, 'Item description is required').max(200),
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer').max(1000000),
  unit: z.string().trim().min(1, 'Unit of measure is required').max(50),
  specification: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

// Create RFQ validation
export const createRfqSchema = z.object({
  projectId: z.string().trim().min(1, 'Project ID is required').max(50),
  title: z.string().trim().min(3, 'RFQ title is required').max(150),
  deliveryLocation: z.string().trim().min(2, 'Delivery site location is required').max(150),
  deliveryRegion: z.string().refine(val => validRegionNames.includes(val) || val.length > 0, {
    message: 'Valid Ghana delivery region is required',
  }),
  deadline: z.string().trim().min(4, 'Quotation submission deadline is required').max(50),
  requiredDeliveryDate: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(rfqItemSchema).min(1, 'At least 1 material line item is required').max(100),
});

// Supplier Quote Line Item validation
export const quotationItemInputSchema = z.object({
  materialRequestItemId: z.string().trim().min(1, 'Material request item ID is required').max(50),
  unitPriceGhs: z.coerce.number().int().positive('Unit price must be a positive integer in GH₵').max(10000000),
  isAvailable: z.boolean().optional().default(true),
  leadTime: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

// Submit Quotation validation
export const submitQuotationSchema = z.object({
  deliveryCostGhs: z.coerce.number().int().nonnegative('Delivery cost must be non-negative in GH₵').max(1000000).default(0),
  validityDate: z.string().trim().min(4, 'Quote validity date is required').max(50),
  leadTimeDays: z.coerce.number().int().positive('Lead time must be positive days').max(365).default(2),
  paymentTerms: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(quotationItemInputSchema).min(1, 'At least 1 priced item is required').max(100),
});

// Accept Quotation validation
export const acceptQuotationSchema = z.object({
  deliveryAddress: z.string().trim().max(200).optional().nullable(),
  deliveryRegion: z.string().trim().max(100).optional().nullable(),
  contactName: z.string().trim().max(100).optional().nullable(),
  contactPhone: z.string().trim().max(50).optional().nullable(),
  scheduledDate: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

// Order status validation
export const updateOrderStatusSchema = z.object({
  status: z.enum(['placed', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled']),
  scheduledDeliveryDate: z.string().trim().max(50).optional().nullable(),
  actualDeliveryDate: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

/**
 * Sanitize untrusted CSV cell contents against Formula Injection (CSV Injection).
 * Strips leading execution triggers (=, +, -, @, \t, \r).
 */
export function sanitizeCsvCell(cell: string): string {
  if (!cell || typeof cell !== 'string') return '';
  let cleaned = cell.trim();
  while (cleaned.length > 0 && ['=', '+', '-', '@', '\t', '\r'].includes(cleaned[0])) {
    cleaned = cleaned.slice(1).trim();
  }
  return cleaned;
}
