# Release & Deployment Operations

This document establishes the release check protocols, migrations steps, and rollback plans for deploying SideQuest to live server workspaces.

---

## 📋 Release Checklist

1. **Local Test Runs**:
   - Ensure `npm run test` executes successfully.
2. **Typescript Compilation**:
   - Verify `npm run build` runs with zero warnings or errors.
3. **Database migrations check**:
   - Confirm Prisma schema matches database versioning constraints.

---

## 🚀 Deployment Guides

### 1. PostgreSQL (Supabase / Render)
- Connect using connection pooling parameters for production.
- Make sure SSL certificates are configured on target databases.

### 2. Next.js Web App (Vercel)
- Create new Vercel project referencing the repository fork.
- Map the environment variables (`DATABASE_URL`, `JWT_SECRET`, etc.).
- Build command: `next build`.

---

## 🧯 Rollback & Recovery Procedures

- **Database Rollback**:
  - Keep backup SQL dumps daily.
  - If a migration fails: `npx prisma db push --force-reset` can re-sync schemas if local test workspaces are compromised (warning: erases active database, use with caution!).
- **Web App Rollback**:
  - Revert the main branch using git, triggering Vercel to automatically redeploy the previous stable build.
