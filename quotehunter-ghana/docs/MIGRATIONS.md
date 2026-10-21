# Database Migrations Guide

## Policy
1. Deployments must NEVER delete or recreate user database tables.
2. All schema changes must be declared in `src/db/schema.ts` and managed through Drizzle Kit.
3. No destructive `DROP TABLE` commands in runtime scripts.

## Migration Workflow
1. Declare schema modifications in `src/db/schema.ts`.
2. Generate migration artifacts via Drizzle Kit:
   `npx drizzle-kit generate`
3. Apply migration to the Cloud SQL database:
   `npx drizzle-kit migrate` (or via Cloud SQL `UpdateSchema` RPC in AI Studio).
4. Verify migration against `information_schema.columns`.
