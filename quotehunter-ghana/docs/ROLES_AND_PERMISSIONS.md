# Roles & Permissions Specification (RBAC)

## User Roles

### 1. CONTRACTOR (`contractor`)
- **Entities Owned**: Contractor Organization, Projects, Material Requests (RFQs), Orders (as Buyer).
- **Capabilities**:
  - Create and manage projects with location and budget.
  - Create material requests with specified quantities and units.
  - Upload Bill of Quantities (BOQ CSV).
  - Compare supplier quotations side-by-side.
  - Accept quotations, issuing purchase orders.
  - Rate and review suppliers after delivery.

### 2. SUPPLIER (`supplier`)
- **Entities Owned**: Supplier Profile, Supplier Catalog Prices, Quotations, Orders (as Seller).
- **Capabilities**:
  - Manage company profile, service regions (e.g. Greater Accra, Ashanti, Western), and warehouse address.
  - Maintain price book and stock availability.
  - Browse open RFQs in serviced regions.
  - Submit formal quotations with unit prices, validity dates, and delivery costs.
  - Update fulfillment and delivery status (`in_transit`, `delivered`).

### 3. ADMIN (`admin`)
- **Capabilities**:
  - Review and verify/reject supplier business credentials (Registrar General registration, GRA TIN).
  - Inspect audit logs.
  - Moderate users and organizations.
  - Monitor platform-wide RFQ and quotation metrics.

### 4. SUPER ADMIN (`super_admin`)
- **Capabilities**:
  - System-level configuration.
  - Platform policy adjustments.
  - Admin account provisioning.
