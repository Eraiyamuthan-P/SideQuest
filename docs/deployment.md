# SideQuest Production Deployment & Maintenance Guide

This document outlines environment settings, production server setup, database seeding, migration pathways, and routine backup procedures for deploying **SideQuest**.

---

## 1. Environment Variables Configuration

Create a `.env` file in the root of the project with the following parameters:

```bash
# App Settings
NEXT_PUBLIC_APP_URL="https://sidequest.university.edu"
NODE_ENV="production"

# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://db_user:db_password@localhost:5432/sidequest?schema=public"

# Session Keys
JWT_SECRET="generate-a-secure-random-32-character-key"

# Google Authentication (OAuth 2.0)
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Email SMTP Server (OTP dispatch)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="smtp-delivery@gmail.com"
SMTP_PASSWORD="smtp-app-specific-password"
SMTP_FROM="SideQuest Notifications <no-reply@sidequest.university.edu>"
```

---

## 2. Production Deployment Steps

### Option A: Serverless Hosting (e.g., Vercel / Netlify)
1. Import the repository into your Vercel Dashboard.
2. Configure all **Environment Variables** in the project settings.
3. Add the following command in the **Build Command** override to compile assets and generate types:
   ```bash
   npx prisma generate && next build
   ```
4. Configure a Serverless PostgreSQL database (e.g., Neon or AWS RDS) and paste the URL into `DATABASE_URL`.

### Option B: Virtual Machine (e.g., Ubuntu VPS / AWS EC2)
1. SSH into the server and clone the repository.
2. Install Node.js (v18+) and PostgreSQL.
3. Configure the local PostgreSQL server and create a database named `sidequest`.
4. Install package dependencies and build production assets:
   ```bash
   npm ci
   npx prisma generate
   npx prisma db push
   npm run build
   ```
5. Configure a process manager like **PM2** to keep the server running continuously:
   ```bash
   npm i -g pm2
   pm2 start npm --name "sidequest" -- run start
   pm2 save
   pm2 startup
   ```

---

## 3. Database Migrations & Seeds

### Schema Migrations
During production releases, apply database updates safely without data loss by running:
```bash
npx prisma db push
```
*Note: For complex multi-branch projects, use `npx prisma migrate dev` during local development to generate SQL transaction files, then deploy them with `npx prisma migrate deploy`.*

### Database Seeding
To register initial mock datasets and default administrator accounts on a fresh database instance:
```bash
npx tsx prisma/seed.ts
```

---

## 4. Maintenance & Backups

### Automated Database Backups
Schedule daily compressed database dumps using a cron job.

**Backup Script (`backup.sh`):**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/sidequest"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="sidequest"

mkdir -p "$BACKUP_DIR"
pg_dump -U db_user "$DB_NAME" | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# Retention policy: Delete backups older than 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

Set up a cron schedule to execute the script every night at 2:00 AM:
```bash
0 2 * * * /bin/bash /path/to/backup.sh
```

### Server Diagnostics Monitoring
The public system health dashboard can be accessed at:
```text
https://[domain-name]/status
```
It monitors database roundtrip ping latency, Next.js uptime metrics, and active build logs.
