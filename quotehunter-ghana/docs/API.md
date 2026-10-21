# API Specification

Base Path: `/api`

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/auth/me` | GET | Any | Returns authenticated user and active organization |
| `/auth/session` | POST | Public | Authenticates/registers user session |
| `/materials/categories` | GET | Public | Lists all construction material categories |
| `/materials` | GET | Public | Lists standard materials with specs and units |
| `/projects` | GET, POST | Contractor | Lists/creates projects for the contractor's organization |
| `/rfqs` | GET, POST | Contractor/Supplier | Lists RFQs; contractor creates RFQ with line items |
| `/rfqs/:id` | GET | Auth | Retrieves detailed RFQ with items and authorized quotes |
| `/rfqs/parse-boq` | POST | Contractor | Parses and validates BOQ CSV data against material catalog |
| `/rfqs/:id/quotations` | POST | Supplier | Submits quotation with server-side pricing recalculation |
| `/rfqs/:id/comparison-matrix` | GET | Contractor | Side-by-side comparison table of all bids for an RFQ |
| `/quotations/:id/accept` | POST | Contractor | Accepts quote, awards RFQ, and creates formal Order |
| `/orders` | GET | Buyer/Supplier | Lists orders |
| `/orders/:id/status` | PATCH | Supplier/Buyer | Updates order fulfillment state |
| `/suppliers` | GET | Public | Lists verified suppliers with ratings and fleet information |
| `/admin/overview` | GET | Admin | Platform statistics (users, orgs, RFQs, quotes, orders) |
| `/admin/suppliers/pending` | GET | Admin | Lists supplier applications awaiting review |
| `/admin/suppliers/:id/verify` | POST | Admin | Approves or rejects supplier verification |
| `/admin/audit-logs` | GET | Admin | Paginated security and business audit logs |
| `/notifications` | GET | Auth | User notifications |
