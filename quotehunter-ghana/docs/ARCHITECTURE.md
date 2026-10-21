# QuoteHunter Ghana — System Architecture

## 1. Overview
QuoteHunter Ghana is a cloud-native B2B construction-material procurement and quotation platform engineered for Ghanaian contractors, quantity surveyors, project managers, and building material suppliers.

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Frontend (React 19)                  │
│       Vite + Tailwind CSS + Lucide Icons + Typography       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST (Bearer Auth)
┌──────────────────────────────▼──────────────────────────────┐
│                    Express API Backend                      │
│   • Auth Verification (Firebase Bearer + Session Token)     │
│   • Role-Based Access Control (RBAC) & Org Isolation        │
│   • Server-Authoritative Calculation Engine                 │
│   • Audit Logging & Security Header Enforcement             │
└──────────────────────────────┬──────────────────────────────┘
                               │ Object Method Pool
┌──────────────────────────────▼──────────────────────────────┐
│           Managed PostgreSQL (Google Cloud SQL)             │
│   • 16 Normalized Tables (Organizations, RFQs, Quotes)      │
│   • Foreign Keys, Cascades, Strict Typing                   │
│   • Drizzle ORM Schema & Versioned Migrations               │
└─────────────────────────────────────────────────────────────┘
```

## 2. Core Modules
- **Identity & Organization Layer**: Multi-tenant model where users belong to organizations (Contractor firms, Supplier distributors, or Admin operations).
- **Material Catalog Engine**: Standardized Ghanaian construction materials (Ghacem, Dangote, BS4449 Grade 500B rebar, quarry aggregates, blocks).
- **Procurement Workflow**:
  1. Contractor creates Project.
  2. Contractor initiates Material Request (RFQ) or imports BOQ (CSV).
  3. Verified Suppliers submit granular Quotations with line items, lead times, and delivery fees.
  4. Contractor reviews side-by-side comparison matrix.
  5. Contractor awards Quotation, automatically creating a legally binding Purchase Order.
  6. Fulfillment tracking and contractor reviews.
- **Audit & Governance**: Immutable audit trail of logins, RFQ creation, quote submissions, status changes, and administrator verifications.
