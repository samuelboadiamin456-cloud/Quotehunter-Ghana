# Database Schema & Relational Design

The system uses **PostgreSQL 18** managed via **Drizzle ORM**.

## Entities & Relationships

| Entity | Primary Key | Description |
|---|---|---|
| `users` | `id` (text / UID) | System accounts linked to Firebase Auth UID |
| `organizations` | `id` (UUID) | Contractor, Supplier, and Admin companies |
| `organization_members` | `id` (UUID) | User-Organization memberships and specific roles |
| `projects` | `id` (UUID) | Construction sites and projects managed by contractors |
| `material_categories` | `id` (text) | Ghanaian construction trade classifications |
| `materials` | `id` (text) | Standard building materials and engineering specs |
| `supplier_profiles` | `id` (UUID) | Verification status, warehouse address, rating, fleet |
| `supplier_materials` | `id` (UUID) | Supplier pricing, stock status, minimum order quantities |
| `material_requests` | `id` (UUID) | RFQs with deadline, delivery region, status |
| `material_request_items` | `id` (UUID) | Quantities, units, specifications per RFQ |
| `quotations` | `id` (UUID) | Bids submitted by suppliers with subtotal and delivery cost |
| `quotation_items` | `id` (UUID) | Itemized pricing and lead times per quotation |
| `orders` | `id` (UUID) | Accepted procurement contracts and fulfillment state |
| `reviews` | `id` (UUID) | Post-order ratings on quality and punctuality |
| `notifications` | `id` (UUID) | Alerts on quotes received, order updates |
| `audit_logs` | `id` (UUID) | Security and compliance audit trail |

## Monetary & Quantity Handling
All monetary figures are stored in whole Ghanaian Cedis (GHS) or fixed integers to prevent floating-point rounding inaccuracies. Line totals and quotation aggregates are verified server-side.
