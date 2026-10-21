# Security Policy & Defense in Depth

## 1. Authentication & Session Hygiene
- Real Firebase Auth token verification using Firebase Admin SDK.
- Support for secure Bearer tokens without storing passwords in plaintext or exposing service keys to the browser.
- No sensitive keys or credentials committed to Git or embedded in frontend bundles.

## 2. Authorization & IDOR/BOLA Protection
- Every protected operation enforces:
  1. Active account status (suspended users are denied immediately).
  2. Organization membership check (Contractor A cannot inspect or modify Contractor B's projects or RFQs).
  3. Supplier quote isolation (Suppliers cannot inspect competing quotation prices on an RFQ).
  4. Explicit role checks for administrative routes (`requireAdmin`, `requireSuperAdmin`).

## 3. Server-Authoritative Business Logic
- The client NEVER calculates order totals or quotation totals.
- The server loops over validated line items: `item.unit_price * db_item.quantity` and adds validated delivery fees.

## 4. HTTP Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`

## 5. Audit Trail
- High-risk operations (User login, RFQ creation, quote submission, quote acceptance, supplier verification changes) are logged to the `audit_logs` table with actor UID, IP address, and metadata.
