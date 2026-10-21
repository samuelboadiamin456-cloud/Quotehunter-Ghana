# Deployment & Operations Guide

## Production Target
- **Platform**: Google Cloud Run + Google Cloud SQL (PostgreSQL).
- **Environment**: Containerized Node.js 22 LTS ES Module runtime.

## Pre-Deployment Verification Checklist
1. Database backup snapshot confirmed.
2. Migrations applied non-destructively.
3. Environment variables configured in runtime secrets (`SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`).
4. Client build generated with `npm run build`.
5. Container starts with `node server.ts` or `tsx server.ts`.
